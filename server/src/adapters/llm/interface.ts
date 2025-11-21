// LLM 提供商统一接口

import { TradeDecision, ReflectionInput, ReflectionOutput, StockPickerInput, StockRecommendation } from '../../types';

export interface LLMConfig {
  apiKey: string;
  apiUrl: string;
  modelId: string;
}

/**
 * 所有 LLM 提供商必须实现此接口
 */
export interface ILLMProvider {
  /**
   * 初始化配置
   */
  initialize(config: LLMConfig): void;

  /**
   * 核心决策方法：分析市场数据和新闻，输出交易决策
   * @param context 上下文信息
   * @returns 交易决策列表
   */
  analyze(context: {
    stockPool: string[]; // 股票池
    marketData: Record<string, any>; // 市场数据
    newsData: any[]; // 新闻数据
    portfolio: any; // 当前持仓
    reflections: string[]; // 历史反思经验
  }): Promise<TradeDecision[]>;

  /**
   * 反思方法：根据交易结果生成经验教训
   * @param input 反思输入
   * @returns 反思结果
   */
  reflect(input: ReflectionInput): Promise<ReflectionOutput>;

  /**
   * AI 选股方法
   * @param input 选股条件
   * @returns 推荐的股票列表
   */
  pickStocks(input: StockPickerInput): Promise<StockRecommendation[]>;
}

