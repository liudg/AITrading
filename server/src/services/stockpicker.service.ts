// AI 选股服务

import { prisma } from "../lib/prisma";
import { Logger } from "../lib/logger";
import { ILLMProvider } from "../adapters/llm/interface";
import { StockPickerInput, StockRecommendation, SingleStockAnalysisInput, SingleStockAnalysisOutput } from "../types";
import { PromptBuilder } from "../adapters/llm/prompt.builder";

const logger = Logger.create("StockPickerService");

export class StockPickerService {
  constructor(private llmProvider: ILLMProvider) {}

  /**
   * AI 选股
   */
  async pickStocks(
    criteria: string,
    maxResults: number = 10
  ): Promise<StockRecommendation[]> {
    const input: StockPickerInput = {
      criteria,
      maxResults,
    };

    const recommendations = await this.llmProvider.pickStocks(input);

    logger.info(`AI recommended ${recommendations.length} stocks`);

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * 单一股票分析
   */
  async analyzeSingleStock(
    symbol: string,
    criteria?: string
  ): Promise<SingleStockAnalysisOutput> {
    const input: SingleStockAnalysisInput = {
      symbol,
      criteria,
    };

    const analysis = await this.llmProvider.analyzeSingleStock(input);

    logger.info(`AI analyzed stock: ${symbol}`);

    return analysis;
  }

  /**
   * 预览批量选股提示词（不调用LLM）
   */
  previewStockPickerPrompt(
    criteria: string,
    maxResults: number = 10
  ): { systemPrompt: string; userPrompt: string } {
    const input: StockPickerInput = {
      criteria,
      maxResults,
    };

    return {
      systemPrompt: PromptBuilder.SYSTEM_PROMPT_PICKER,
      userPrompt: PromptBuilder.buildStockPickerPrompt(input),
    };
  }

  /**
   * 预览单一股票分析提示词（不调用LLM）
   */
  previewSingleStockPrompt(
    symbol: string,
    criteria?: string
  ): { systemPrompt: string; userPrompt: string } {
    const input: SingleStockAnalysisInput = {
      symbol,
      criteria,
    };

    return {
      systemPrompt: PromptBuilder.SYSTEM_PROMPT_SINGLE_STOCK,
      userPrompt: PromptBuilder.buildSingleStockAnalysisPrompt(input),
    };
  }

  /**
   * 保存股票池
   */
  async saveStockPool(
    symbols: string[],
    name: string,
    createdBy: "AI" | "USER",
    reason?: string
  ): Promise<string> {
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

    logger.info(
      `Created new stock pool: ${name} with ${symbols.length} symbols`
    );

    return stockPool.id;
  }

  /**
   * 获取当前活跃的股票池
   */
  async getActiveStockPool(): Promise<string[]> {
    const stockPool = await prisma.stockPool.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    if (!stockPool) {
      // 如果没有股票池，从环境变量读取默认股票池
      const defaultPool =
        process.env.DEFAULT_STOCK_POOL ||
        "NVDA,TSLA,AAPL,MSFT,GOOGL,META,AMZN,AMD,NFLX,BABA";
      const symbols = defaultPool
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      logger.info(`使用默认股票池: ${symbols.join(", ")}`);
      return symbols;
    }

    return JSON.parse(stockPool.symbols);
  }
}
