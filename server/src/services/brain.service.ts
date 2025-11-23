// AI 决策引擎服务

import { prisma } from '../lib/prisma';
import { Logger } from '../lib/logger';
import { ILLMProvider } from '../adapters/llm/interface';
import { IMarketDataProvider, INewsDataProvider } from '../adapters/data/interface';
import { TradeDecision } from '../types';
import { PortfolioService } from './portfolio.service';

const logger = Logger.create('BrainService');

export class BrainService {
  constructor(
    private llmProvider: ILLMProvider,
    private marketDataProvider: IMarketDataProvider,
    private newsDataProvider: INewsDataProvider,
    private portfolioService: PortfolioService
  ) {}

  /**
   * 执行交易分析和决策
   */
  async analyze(modelId: string, stockPool: string[]): Promise<TradeDecision[]> {
    // 1. 获取当前投资组合状态
    const portfolio = await this.portfolioService.getPortfolioStatus(modelId);

    // 2. 获取市场数据
    const marketData = await this.marketDataProvider.getMarketData(stockPool, 30);
    const currentPrices = await this.marketDataProvider.getCurrentPrices(stockPool);

    // 3. 获取新闻数据
    const newsData = await this.newsDataProvider.getNews(stockPool, 24);

    // 4. 获取历史反思（经验教训）
    const reflections = await this.getReflections(modelId, 10);

    // 5. 调用 LLM 进行决策
    const decisions = await this.llmProvider.analyze({
      stockPool,
      marketData: { historical: marketData, current: currentPrices },
      newsData,
      portfolio: {
        cash: portfolio.cash,
        totalValue: portfolio.totalValue,
        positions: portfolio.positions,
      },
      reflections: reflections.map((r) => r.content),
    });

    logger.info(`Model ${modelId} generated ${decisions.length} decisions`);

    return decisions;
  }

  /**
   * 执行交易决策
   */
  async executeTrades(modelId: string, decisions: TradeDecision[]): Promise<void> {
    const currentPrices = await this.marketDataProvider.getCurrentPrices(decisions.map((d) => d.symbol));

    for (const decision of decisions) {
      if (decision.action === 'HOLD') {
        continue;
      }

      try {
        const price = currentPrices[decision.symbol];

        if (decision.action === 'BUY') {
          await this.executeBuy(modelId, decision, price);
        } else if (decision.action === 'SELL') {
          await this.executeSell(modelId, decision, price);
        }
      } catch (error: any) {
        logger.error(`Failed to execute trade for ${decision.symbol}`, error);
      }
    }
  }

  /**
   * 执行买入
   */
  private async executeBuy(modelId: string, decision: TradeDecision, price: number): Promise<void> {
    const portfolio = await this.portfolioService.getPortfolioStatus(modelId);

    // 计算购买数量
    const targetValue = portfolio.totalValue * decision.positionSize;
    const quantity = Math.floor(targetValue / price);

    if (quantity === 0) {
      logger.debug(`Skipping BUY ${decision.symbol}: quantity would be 0`);
      return;
    }

    // 检查仓位约束（预检查，executeBuy 内部也会再次检查）
    const check = this.portfolioService.canTrade(portfolio, decision.symbol, decision.positionSize);
    if (!check.allowed) {
      logger.debug(`Skipping BUY ${decision.symbol}: ${check.reason}`);
      return;
    }

    // 执行交易（内部有事务保护和风控检查）
    await this.portfolioService.executeBuy(modelId, decision.symbol, quantity, price);

    // 记录交易
    await prisma.trade.create({
      data: {
        modelId,
        symbol: decision.symbol,
        side: 'BUY',
        quantity,
        price,
        amount: quantity * price,
        rationale: decision.rationale,
        status: 'EXECUTED',
        executedAt: new Date(),
      },
    });

    logger.info(`Executed BUY ${quantity} ${decision.symbol} @ $${price.toFixed(2)}`);
  }

  /**
   * 执行卖出
   */
  private async executeSell(modelId: string, decision: TradeDecision, price: number): Promise<void> {
    const portfolio = await this.portfolioService.getPortfolioStatus(modelId);

    // 查找当前持仓
    const position = portfolio.positions.find((p) => p.symbol === decision.symbol);
    if (!position || position.quantity === 0) {
      logger.debug(`Skipping SELL ${decision.symbol}: no position`);
      return;
    }

    // 执行交易
    const pnl = await this.portfolioService.executeSell(modelId, decision.symbol, position.quantity, price);

    // 记录交易并标记为 CLOSED
    await prisma.trade.create({
      data: {
        modelId,
        symbol: decision.symbol,
        side: 'SELL',
        quantity: position.quantity,
        price,
        amount: position.quantity * price,
        rationale: decision.rationale,
        status: 'CLOSED',
        executedAt: new Date(),
        closedAt: new Date(),
        pnl,
      },
    });

    logger.info(`Executed SELL ${position.quantity} ${decision.symbol} @ $${price.toFixed(2)}, P&L: $${pnl.toFixed(2)}`);
  }

  /**
   * 获取历史反思
   */
  private async getReflections(modelId: string, limit: number = 10) {
    return await prisma.reflection.findMany({
      where: { modelId },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }
}

