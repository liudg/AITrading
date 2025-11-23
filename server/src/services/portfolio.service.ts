// 投资组合管理服务

import { prisma, PrismaTransactionClient } from '../lib/prisma';
import { PortfolioStatus } from '../types';

export class PortfolioService {
  // 从环境变量读取仓位限制配置
  private readonly MAX_POSITION_SIZE: number;
  private readonly MAX_TOTAL_POSITION: number;

  constructor() {
    this.MAX_POSITION_SIZE = parseFloat(process.env.MAX_POSITION_SIZE || '0.2');
    this.MAX_TOTAL_POSITION = parseFloat(process.env.MAX_TOTAL_POSITION || '0.8');
  }

  /**
   * 获取初始资金配置
   */
  private getInitialCapital(): number {
    return parseFloat(process.env.INITIAL_CAPITAL || '100000');
  }
  /**
   * 初始化模型的投资组合（使用环境变量配置初始资金）
   */
  async initializePortfolio(modelId: string, initialValue?: number): Promise<void> {
    const existing = await prisma.portfolio.findUnique({
      where: { modelId },
    });

    if (!existing) {
      const capital = initialValue ?? this.getInitialCapital();
      await prisma.portfolio.create({
        data: {
          modelId,
          cash: capital,
          totalValue: capital,
          initialValue: capital,
        },
      });
    }
  }

  /**
   * 获取投资组合状态
   */
  async getPortfolioStatus(modelId: string): Promise<PortfolioStatus> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { modelId },
      include: {
        model: true,
        positions: true,
      },
    });

    if (!portfolio) {
      throw new Error(`Portfolio not found for model ${modelId}`);
    }

    // 计算性能指标
    const totalReturn = portfolio.totalValue - portfolio.initialValue;
    const totalReturnPct = (totalReturn / portfolio.initialValue) * 100;

    // 计算日收益（对比昨天的快照）
    const { dailyReturn, dailyReturnPct } = await this.calculateDailyReturn(portfolio.id, portfolio.totalValue);

    return {
      modelId: portfolio.modelId,
      modelName: portfolio.model.displayName,
      cash: portfolio.cash,
      totalValue: portfolio.totalValue,
      positions: portfolio.positions.map((pos) => ({
        symbol: pos.symbol,
        quantity: pos.quantity,
        avgPrice: pos.avgPrice,
        currentPrice: pos.currentPrice,
        marketValue: pos.marketValue,
        unrealizedPnL: pos.unrealizedPnL,
      })),
      performance: {
        totalReturn,
        totalReturnPct,
        dailyReturn,
        dailyReturnPct,
      },
    };
  }

  /**
   * 执行买入操作（带事务和风控检查）
   */
  async executeBuy(modelId: string, symbol: string, quantity: number, price: number): Promise<void> {
    // 使用事务确保数据一致性
    await prisma.$transaction(async (tx) => {
      // 1. 获取投资组合（加锁）
      const portfolio = await tx.portfolio.findUnique({
        where: { modelId },
        include: { positions: true },
      });

      if (!portfolio) {
        throw new Error(`Portfolio not found for model ${modelId}`);
      }

      const cost = quantity * price;

      // 2. 检查现金是否足够
      if (cost > portfolio.cash) {
        throw new Error(`Insufficient cash. Required: $${cost.toFixed(2)}, Available: $${portfolio.cash.toFixed(2)}`);
      }

      // 3. 风控检查：计算新仓位占比
      const newPositionValue = quantity * price;
      const positionSizeRatio = newPositionValue / portfolio.totalValue;

      // 检查单只股票仓位限制
      const existingPosition = portfolio.positions.find((p) => p.symbol === symbol);
      const existingPositionValue = existingPosition?.marketValue || 0;
      const totalPositionValue = existingPositionValue + newPositionValue;
      const totalPositionRatio = totalPositionValue / portfolio.totalValue;

      if (totalPositionRatio > this.MAX_POSITION_SIZE) {
        throw new Error(
          `Position size ${(totalPositionRatio * 100).toFixed(1)}% exceeds maximum ${(
            this.MAX_POSITION_SIZE * 100
          ).toFixed(1)}%`
        );
      }

      // 检查总仓位限制
      const currentTotalPositionValue = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
      const projectedTotalPositionValue = currentTotalPositionValue + newPositionValue;
      const projectedTotalPositionRatio = projectedTotalPositionValue / portfolio.totalValue;

      if (projectedTotalPositionRatio > this.MAX_TOTAL_POSITION) {
        throw new Error(
          `Total position would be ${(projectedTotalPositionRatio * 100).toFixed(1)}%, exceeds maximum ${(
            this.MAX_TOTAL_POSITION * 100
          ).toFixed(1)}%`
        );
      }

      // 4. 扣除现金
      await tx.portfolio.update({
        where: { modelId },
        data: {
          cash: portfolio.cash - cost,
        },
      });

      // 5. 更新或创建持仓
      if (existingPosition) {
        // 增加持仓
        const newQuantity = existingPosition.quantity + quantity;
        const newAvgPrice = (existingPosition.avgPrice * existingPosition.quantity + price * quantity) / newQuantity;

        await tx.position.update({
          where: { id: existingPosition.id },
          data: {
            quantity: newQuantity,
            avgPrice: newAvgPrice,
            currentPrice: price,
            marketValue: newQuantity * price,
            unrealizedPnL: (price - newAvgPrice) * newQuantity,
          },
        });
      } else {
        // 创建新持仓
        await tx.position.create({
          data: {
            portfolioId: portfolio.id,
            symbol,
            quantity,
            avgPrice: price,
            currentPrice: price,
            marketValue: quantity * price,
            unrealizedPnL: 0,
          },
        });
      }

      // 6. 更新总资产（在事务内）
      await this.updateTotalValueInTransaction(tx, modelId, portfolio.id, portfolio.initialValue);
    });
  }

  /**
   * 执行卖出操作（带事务）
   */
  async executeSell(modelId: string, symbol: string, quantity: number, price: number): Promise<number> {
    // 使用事务确保数据一致性
    return await prisma.$transaction(async (tx) => {
      // 1. 获取投资组合和持仓
      const portfolio = await tx.portfolio.findUnique({
        where: { modelId },
        include: { positions: true },
      });

      if (!portfolio) {
        throw new Error(`Portfolio not found for model ${modelId}`);
      }

      const position = await tx.position.findUnique({
        where: {
          portfolioId_symbol: {
            portfolioId: portfolio.id,
            symbol,
          },
        },
      });

      // 2. 检查持仓是否足够
      if (!position || position.quantity < quantity) {
        throw new Error(`Insufficient position. Symbol: ${symbol}, Available: ${position?.quantity || 0}`);
      }

      const revenue = quantity * price;
      const pnl = (price - position.avgPrice) * quantity;

      // 3. 增加现金
      await tx.portfolio.update({
        where: { modelId },
        data: {
          cash: portfolio.cash + revenue,
        },
      });

      // 4. 更新持仓
      if (position.quantity === quantity) {
        // 完全卖出，删除持仓
        await tx.position.delete({
          where: { id: position.id },
        });
      } else {
        // 部分卖出
        const newQuantity = position.quantity - quantity;
        await tx.position.update({
          where: { id: position.id },
          data: {
            quantity: newQuantity,
            currentPrice: price,
            marketValue: newQuantity * price,
            unrealizedPnL: (price - position.avgPrice) * newQuantity,
          },
        });
      }

      // 5. 更新总资产（在事务内）
      await this.updateTotalValueInTransaction(tx, modelId, portfolio.id, portfolio.initialValue);

      return pnl;
    });
  }

  /**
   * 更新持仓的当前价格和未实现盈亏（并行处理优化）
   */
  async updatePositionPrices(modelId: string, currentPrices: Record<string, number>): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { modelId },
      include: { positions: true },
    });

    if (!portfolio) {
      return;
    }

    // 使用 Promise.all 并行更新所有持仓
    const updatePromises = portfolio.positions
      .filter((position) => currentPrices[position.symbol] !== undefined)
      .map((position) => {
        const currentPrice = currentPrices[position.symbol];
        return prisma.position.update({
          where: { id: position.id },
          data: {
            currentPrice,
            marketValue: position.quantity * currentPrice,
            unrealizedPnL: (currentPrice - position.avgPrice) * position.quantity,
          },
        });
      });

    await Promise.all(updatePromises);

    // 更新总资产
    await this.updateTotalValue(modelId);
  }

  /**
   * 更新投资组合总资产（普通方法）
   */
  private async updateTotalValue(modelId: string): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { modelId },
      include: { positions: true },
    });

    if (!portfolio) {
      return;
    }

    const positionsValue = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalValue = portfolio.cash + positionsValue;

    await prisma.portfolio.update({
      where: { modelId },
      data: { totalValue },
    });

    // 创建资产快照（用于绘制资产曲线）
    await this.createSnapshot(portfolio.id, totalValue, portfolio.cash, positionsValue, portfolio.initialValue);
  }

  /**
   * 计算日收益（对比昨天的快照）
   */
  private async calculateDailyReturn(
    portfolioId: string,
    currentTotalValue: number
  ): Promise<{ dailyReturn: number; dailyReturnPct: number }> {
    // 获取24小时前的快照
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const yesterdaySnapshot = await prisma.portfolioSnapshot.findFirst({
      where: {
        portfolioId,
        timestamp: {
          lte: yesterday,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (!yesterdaySnapshot) {
      // 如果没有昨天的快照，返回 0
      return { dailyReturn: 0, dailyReturnPct: 0 };
    }

    const dailyReturn = currentTotalValue - yesterdaySnapshot.totalValue;
    const dailyReturnPct = (dailyReturn / yesterdaySnapshot.totalValue) * 100;

    return { dailyReturn, dailyReturnPct };
  }

  /**
   * 更新投资组合总资产（事务内使用）
   */
  private async updateTotalValueInTransaction(
    tx: PrismaTransactionClient,
    modelId: string,
    portfolioId: string,
    initialValue: number
  ): Promise<void> {
    const portfolio = await tx.portfolio.findUnique({
      where: { modelId },
      include: { positions: true },
    });

    if (!portfolio) {
      return;
    }

    const positionsValue = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalValue = portfolio.cash + positionsValue;

    await tx.portfolio.update({
      where: { modelId },
      data: { totalValue },
    });

    // 创建资产快照（在事务内）
    const returnPct = ((totalValue - initialValue) / initialValue) * 100;

    await tx.portfolioSnapshot.create({
      data: {
        portfolioId,
        totalValue,
        cash: portfolio.cash,
        positionValue: positionsValue,
        returnPct,
      },
    });
  }

  /**
   * 创建投资组合快照
   */
  private async createSnapshot(
    portfolioId: string,
    totalValue: number,
    cash: number,
    positionValue: number,
    initialValue: number
  ): Promise<void> {
    const returnPct = ((totalValue - initialValue) / initialValue) * 100;

    await prisma.portfolioSnapshot.create({
      data: {
        portfolioId,
        totalValue,
        cash,
        positionValue,
        returnPct,
      },
    });
  }

  /**
   * 获取投资组合历史快照
   */
  async getPortfolioHistory(modelId: string, hoursBack: number = 72): Promise<any[]> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { modelId },
    });

    if (!portfolio) {
      return [];
    }

    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hoursBack);

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        portfolioId: portfolio.id,
        timestamp: {
          gte: startTime,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    return snapshots.map((snapshot) => ({
      timestamp: snapshot.timestamp,
      totalValue: snapshot.totalValue,
      cash: snapshot.cash,
      positionValue: snapshot.positionValue,
      returnPct: snapshot.returnPct,
    }));
  }

  /**
   * 检查仓位约束（使用环境变量配置）
   */
  canTrade(portfolio: PortfolioStatus, symbol: string, positionSize: number): {
    allowed: boolean;
    reason?: string;
  } {
    // 检查单只股票仓位
    if (positionSize > this.MAX_POSITION_SIZE) {
      return {
        allowed: false,
        reason: `Position size ${(positionSize * 100).toFixed(1)}% exceeds maximum ${(
          this.MAX_POSITION_SIZE * 100
        ).toFixed(1)}%`,
      };
    }

    // 计算当前总仓位
    const currentPositionValue = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    // 预计新交易后的总仓位
    const newPositionValue = positionSize * portfolio.totalValue;
    const projectedTotalPosition = (currentPositionValue + newPositionValue) / portfolio.totalValue;

    if (projectedTotalPosition > this.MAX_TOTAL_POSITION) {
      return {
        allowed: false,
        reason: `Total position would be ${(projectedTotalPosition * 100).toFixed(1)}%, exceeds maximum ${(
          this.MAX_TOTAL_POSITION * 100
        ).toFixed(1)}%`,
      };
    }

    return { allowed: true };
  }
}
