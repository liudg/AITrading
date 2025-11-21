// 投资组合管理服务

import { PrismaClient } from '@prisma/client';
import { PortfolioStatus } from '../types';

const prisma = new PrismaClient();

export class PortfolioService {
  /**
   * 初始化模型的投资组合
   */
  async initializePortfolio(modelId: string, initialValue: number = 100000): Promise<void> {
    const existing = await prisma.portfolio.findUnique({
      where: { modelId },
    });

    if (!existing) {
      await prisma.portfolio.create({
        data: {
          modelId,
          cash: initialValue,
          totalValue: initialValue,
          initialValue,
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

    // TODO: 计算日收益 (需要历史数据)
    const dailyReturn = 0;
    const dailyReturnPct = 0;

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
   * 执行买入操作
   */
  async executeBuy(modelId: string, symbol: string, quantity: number, price: number): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { modelId },
    });

    if (!portfolio) {
      throw new Error(`Portfolio not found for model ${modelId}`);
    }

    const cost = quantity * price;

    if (cost > portfolio.cash) {
      throw new Error(`Insufficient cash. Required: $${cost.toFixed(2)}, Available: $${portfolio.cash.toFixed(2)}`);
    }

    // 更新现金
    await prisma.portfolio.update({
      where: { modelId },
      data: {
        cash: portfolio.cash - cost,
      },
    });

    // 更新或创建持仓
    const existingPosition = await prisma.position.findUnique({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolio.id,
          symbol,
        },
      },
    });

    if (existingPosition) {
      // 增加持仓
      const newQuantity = existingPosition.quantity + quantity;
      const newAvgPrice = (existingPosition.avgPrice * existingPosition.quantity + price * quantity) / newQuantity;

      await prisma.position.update({
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
      await prisma.position.create({
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

    // 更新总资产
    await this.updateTotalValue(modelId);
  }

  /**
   * 执行卖出操作
   */
  async executeSell(modelId: string, symbol: string, quantity: number, price: number): Promise<number> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { modelId },
      include: { positions: true },
    });

    if (!portfolio) {
      throw new Error(`Portfolio not found for model ${modelId}`);
    }

    const position = await prisma.position.findUnique({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolio.id,
          symbol,
        },
      },
    });

    if (!position || position.quantity < quantity) {
      throw new Error(`Insufficient position. Symbol: ${symbol}, Available: ${position?.quantity || 0}`);
    }

    const revenue = quantity * price;
    const pnl = (price - position.avgPrice) * quantity;

    // 更新现金
    await prisma.portfolio.update({
      where: { modelId },
      data: {
        cash: portfolio.cash + revenue,
      },
    });

    // 更新持仓
    if (position.quantity === quantity) {
      // 完全卖出，删除持仓
      await prisma.position.delete({
        where: { id: position.id },
      });
    } else {
      // 部分卖出
      const newQuantity = position.quantity - quantity;
      await prisma.position.update({
        where: { id: position.id },
        data: {
          quantity: newQuantity,
          currentPrice: price,
          marketValue: newQuantity * price,
          unrealizedPnL: (price - position.avgPrice) * newQuantity,
        },
      });
    }

    // 更新总资产
    await this.updateTotalValue(modelId);

    return pnl;
  }

  /**
   * 更新持仓的当前价格和未实现盈亏
   */
  async updatePositionPrices(modelId: string, currentPrices: Record<string, number>): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { modelId },
      include: { positions: true },
    });

    if (!portfolio) {
      return;
    }

    for (const position of portfolio.positions) {
      const currentPrice = currentPrices[position.symbol];
      if (currentPrice !== undefined) {
        await prisma.position.update({
          where: { id: position.id },
          data: {
            currentPrice,
            marketValue: position.quantity * currentPrice,
            unrealizedPnL: (currentPrice - position.avgPrice) * position.quantity,
          },
        });
      }
    }

    await this.updateTotalValue(modelId);
  }

  /**
   * 更新投资组合总资产
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
   * 检查仓位约束
   */
  canTrade(portfolio: PortfolioStatus, symbol: string, positionSize: number): {
    allowed: boolean;
    reason?: string;
  } {
    const MAX_POSITION_SIZE = 0.2; // 20%
    const MAX_TOTAL_POSITION = 0.8; // 80%

    // 检查单只股票仓位
    if (positionSize > MAX_POSITION_SIZE) {
      return {
        allowed: false,
        reason: `Position size ${(positionSize * 100).toFixed(1)}% exceeds maximum ${(MAX_POSITION_SIZE * 100).toFixed(
          1
        )}%`,
      };
    }

    // 计算当前总仓位
    const currentPositionValue = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const currentPositionRatio = currentPositionValue / portfolio.totalValue;

    // 预计新交易后的总仓位
    const newPositionValue = positionSize * portfolio.totalValue;
    const projectedTotalPosition = (currentPositionValue + newPositionValue) / portfolio.totalValue;

    if (projectedTotalPosition > MAX_TOTAL_POSITION) {
      return {
        allowed: false,
        reason: `Total position would be ${(projectedTotalPosition * 100).toFixed(1)}%, exceeds maximum ${(
          MAX_TOTAL_POSITION * 100
        ).toFixed(1)}%`,
      };
    }

    return { allowed: true };
  }
}

