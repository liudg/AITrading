// 反思服务

import { PrismaClient } from '@prisma/client';
import { ILLMProvider } from '../adapters/llm/interface';
import { IMarketDataProvider, INewsDataProvider } from '../adapters/data/interface';
import { ReflectionInput } from '../types';

const prisma = new PrismaClient();

export class ReflectionService {
  constructor(
    private llmProvider: ILLMProvider,
    private marketDataProvider: IMarketDataProvider,
    private newsDataProvider: INewsDataProvider
  ) {}

  /**
   * 触发反思流程
   * 查找所有需要反思的交易（T+N 天已平仓）
   */
  async triggerReflections(reflectionDays: number = 5): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - reflectionDays);

    // 查找符合条件的交易
    const trades = await prisma.trade.findMany({
      where: {
        status: 'CLOSED',
        closedAt: {
          lte: cutoffDate,
        },
        reflection: null, // 尚未反思
      },
      include: {
        model: true,
      },
    });

    console.log(`[ReflectionService] Found ${trades.length} trades for reflection`);

    for (const trade of trades) {
      try {
        await this.reflectOnTrade(trade.id);
      } catch (error: any) {
        console.error(`[ReflectionService] Failed to reflect on trade ${trade.id}:`, error.message);
      }
    }
  }

  /**
   * 对单笔交易进行反思
   */
  async reflectOnTrade(tradeId: string): Promise<void> {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { model: true },
    });

    if (!trade || !trade.closedAt || trade.pnl === null) {
      throw new Error(`Trade ${tradeId} is not eligible for reflection`);
    }

    // 查找对应的买入交易（为了获取入场价格和理由）
    const buyTrade = await prisma.trade.findFirst({
      where: {
        modelId: trade.modelId,
        symbol: trade.symbol,
        side: 'BUY',
        executedAt: {
          lt: trade.executedAt || new Date(),
        },
      },
      orderBy: {
        executedAt: 'desc',
      },
    });

    if (!buyTrade) {
      console.log(`[ReflectionService] No BUY trade found for ${trade.symbol}, skipping reflection`);
      return;
    }

    // 构建反思输入
    const entryPrice = buyTrade.price;
    const exitPrice = trade.price;
    const pnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;

    // 获取交易期间的市场数据和新闻
    const marketData = await this.marketDataProvider.getMarketData(
      [trade.symbol],
      Math.ceil((trade.closedAt.getTime() - buyTrade.executedAt!.getTime()) / (1000 * 60 * 60 * 24))
    );

    const newsData = await this.newsDataProvider.getNews([trade.symbol], 24);

    const input: ReflectionInput = {
      tradeId: trade.id,
      symbol: trade.symbol,
      side: 'BUY', // 我们反思的是买入决策
      quantity: trade.quantity,
      entryPrice,
      exitPrice,
      pnl: trade.pnl,
      pnlPct,
      rationale: buyTrade.rationale,
      marketContext: {
        priceChange: pnlPct,
        newsEvents: newsData.slice(0, 3).map((n) => n.title),
      },
    };

    // 调用 LLM 进行反思
    const reflectionOutput = await this.llmProvider.reflect(input);

    // 存储反思结果
    await prisma.reflection.create({
      data: {
        tradeId: trade.id,
        modelId: trade.modelId,
        content: reflectionOutput.content,
        pnl: trade.pnl,
        score: reflectionOutput.score,
      },
    });

    console.log(`[ReflectionService] Created reflection for trade ${trade.id}: "${reflectionOutput.content}"`);
  }
}

