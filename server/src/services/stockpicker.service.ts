// AI 选股服务

import { PrismaClient } from '@prisma/client';
import { ILLMProvider } from '../adapters/llm/interface';
import { StockPickerInput, StockRecommendation } from '../types';

const prisma = new PrismaClient();

export class StockPickerService {
  constructor(private llmProvider: ILLMProvider) {}

  /**
   * AI 选股
   */
  async pickStocks(criteria: string, maxResults: number = 10): Promise<StockRecommendation[]> {
    const input: StockPickerInput = {
      criteria,
      maxResults,
    };

    const recommendations = await this.llmProvider.pickStocks(input);

    console.log(`[StockPickerService] AI recommended ${recommendations.length} stocks`);

    return recommendations.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }

  /**
   * 保存股票池
   */
  async saveStockPool(symbols: string[], name: string, createdBy: 'AI' | 'USER', reason?: string): Promise<string> {
    // 将旧的股票池标记为 inactive
    await prisma.stockPool.updateMany({
      where: { active: true },
      data: { active: false },
    });

    // 创建新股票池
    const stockPool = await prisma.stockPool.create({
      data: {
        name,
        symbols: JSON.stringify(symbols),
        createdBy,
        reason,
        active: true,
      },
    });

    console.log(`[StockPickerService] Created new stock pool: ${name} with ${symbols.length} symbols`);

    return stockPool.id;
  }

  /**
   * 获取当前活跃的股票池
   */
  async getActiveStockPool(): Promise<string[]> {
    const stockPool = await prisma.stockPool.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!stockPool) {
      // 如果没有股票池，返回默认的科技股列表
      return ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN', 'AMD', 'NFLX', 'BABA'];
    }

    return JSON.parse(stockPool.symbols);
  }
}

