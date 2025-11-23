// DeepSeek LLM 适配器
// 基于 OpenAI SDK，支持自动重试和错误处理

import { Logger } from "../../lib/logger";
import {
  TradeDecision,
  ReflectionInput,
  ReflectionOutput,
  StockPickerInput,
  StockRecommendation,
  SingleStockAnalysisInput,
  SingleStockAnalysisOutput,
} from "../../types";
import { BaseAdapter } from "./base.adapter";
import { PromptBuilder, AnalysisContext } from "./prompt.builder";
import { ResponseParser } from "./response.parser";

const logger = Logger.create("DeepSeekAdapter");

/**
 * DeepSeek LLM 适配器
 * 使用 OpenAI 兼容的 API
 */
export class DeepSeekAdapter extends BaseAdapter {
  protected getProviderName(): string {
    return "DeepSeek";
  }

  /**
   * 分析市场并做出交易决策
   */
  async analyze(context: AnalysisContext): Promise<TradeDecision[]> {
    this.ensureInitialized();

    logger.info("开始分析市场数据...");

    // 构建提示词
    const prompt = PromptBuilder.buildAnalysisPrompt(context);

    try {
      // 调用 API（带重试机制）
      const content = await this.callChatAPI(prompt, {
        systemPrompt: PromptBuilder.SYSTEM_PROMPT_ANALYSIS,
        temperature: parseFloat(process.env.LLM_TEMPERATURE_ANALYSIS || "0.7"),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS_ANALYSIS || "4000", 10),
      });

      // 解析响应
      const decisions = ResponseParser.parseDecisions(content);

      logger.info(`成功生成 ${decisions.length} 个交易决策`);
      return decisions;
    } catch (error: any) {
      logger.error("分析失败", error);
      throw error;
    }
  }

  /**
   * 对历史交易进行反思
   */
  async reflect(input: ReflectionInput): Promise<ReflectionOutput> {
    this.ensureInitialized();

    logger.info(`开始反思交易：${input.symbol}`);

    // 构建提示词
    const prompt = PromptBuilder.buildReflectionPrompt(input);

    try {
      // 调用 API（带重试机制）
      const content = await this.callChatAPI(prompt, {
        systemPrompt: PromptBuilder.SYSTEM_PROMPT_REFLECTION,
        temperature: parseFloat(
          process.env.LLM_TEMPERATURE_REFLECTION || "0.8"
        ),
        maxTokens: parseInt(
          process.env.LLM_MAX_TOKENS_REFLECTION || "1000",
          10
        ),
      });

      // 解析响应
      const reflection = ResponseParser.parseReflection(content);

      logger.info("反思完成", { score: reflection.score });
      return reflection;
    } catch (error: any) {
      logger.error("反思失败", error);
      throw error;
    }
  }

  /**
   * 根据用户条件推荐股票
   */
  async pickStocks(input: StockPickerInput): Promise<StockRecommendation[]> {
    this.ensureInitialized();

    logger.info(`开始 AI 选股：${input.criteria}`);

    // 构建提示词
    const prompt = PromptBuilder.buildStockPickerPrompt(input);

    try {
      // 调用 API（带重试机制）
      const content = await this.callChatAPI(prompt, {
        systemPrompt: PromptBuilder.SYSTEM_PROMPT_PICKER,
        temperature: parseFloat(process.env.LLM_TEMPERATURE_PICKER || "0.7"),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS_PICKER || "2000", 10),
      });

      // 解析响应
      const recommendations = ResponseParser.parseStockRecommendations(content);

      logger.info(`成功推荐 ${recommendations.length} 只股票`);
      return recommendations;
    } catch (error: any) {
      logger.error("选股失败", error);
      throw error;
    }
  }

  /**
   * 分析单一股票
   */
  async analyzeSingleStock(
    input: SingleStockAnalysisInput
  ): Promise<SingleStockAnalysisOutput> {
    this.ensureInitialized();

    logger.info(`开始分析股票：${input.symbol}`);

    // 构建提示词
    const prompt = PromptBuilder.buildSingleStockAnalysisPrompt(input);

    try {
      // 调用 API（带重试机制）
      const content = await this.callChatAPI(prompt, {
        systemPrompt: PromptBuilder.SYSTEM_PROMPT_SINGLE_STOCK,
        temperature: parseFloat(process.env.LLM_TEMPERATURE_ANALYSIS || "0.7"),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS_ANALYSIS || "4000", 10),
      });

      // 解析响应
      const analysis = ResponseParser.parseSingleStockAnalysis(content);

      logger.info(`成功分析股票 ${input.symbol}`);
      return analysis;
    } catch (error: any) {
      logger.error("股票分析失败", error);
      throw error;
    }
  }
}
