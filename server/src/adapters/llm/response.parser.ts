// 统一的响应解析器
// 提供健壮的 JSON 解析和 Schema 验证

import { Logger } from '../../lib/logger';
import { TradeDecision, ReflectionOutput, StockRecommendation, SingleStockAnalysisOutput } from '../../types';

const logger = Logger.create('ResponseParser');

/**
 * 响应解析器
 */
export class ResponseParser {
  /**
   * 从 LLM 响应中提取 JSON
   * 支持多种格式：纯 JSON、Markdown 代码块、混合文本
   */
  private static extractJSON(content: string): string | null {
    if (!content || content.trim() === '') {
      return null;
    }

    // 1. 尝试提取 Markdown 代码块中的 JSON
    const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (markdownMatch) {
      return markdownMatch[1].trim();
    }

    // 2. 尝试提取第一个完整的 JSON 数组
    const arrayMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (arrayMatch) {
      return arrayMatch[0];
    }

    // 3. 尝试提取第一个完整的 JSON 对象
    const objectMatch = content.match(/\{\s*"[\s\S]*?\}/);
    if (objectMatch) {
      // 需要找到匹配的结束括号
      let depth = 0;
      let start = objectMatch.index!;
      for (let i = start; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
          depth--;
          if (depth === 0) {
            return content.substring(start, i + 1);
          }
        }
      }
    }

    // 4. 如果都没有匹配到，尝试将整个内容作为 JSON
    return content.trim();
  }

  /**
   * 安全的 JSON 解析
   */
  private static safeJSONParse<T>(jsonStr: string): T | null {
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.warn('JSON 解析失败', { jsonStr, error });
      return null;
    }
  }

  /**
   * 解析交易决策
   */
  static parseDecisions(content: string): TradeDecision[] {
    try {
      const jsonStr = this.extractJSON(content);
      if (!jsonStr) {
        logger.warn('未找到 JSON 内容', { content });
        return [];
      }

      const parsed = this.safeJSONParse<any>(jsonStr);
      if (!parsed) {
        return [];
      }

      // 确保返回的是数组
      const decisions = Array.isArray(parsed) ? parsed : [parsed];

      // 验证并过滤有效的决策
      const validDecisions: TradeDecision[] = [];
      for (const decision of decisions) {
        if (this.validateTradeDecision(decision)) {
          validDecisions.push({
            symbol: decision.symbol,
            action: decision.action.toUpperCase() as 'BUY' | 'SELL' | 'HOLD',
            positionSize: this.clamp(decision.positionSize, 0, 1),
            rationale: decision.rationale || '未提供理由',
            confidence: this.clamp(decision.confidence, 0, 1),
          });
        } else {
          logger.warn('无效的交易决策', { decision });
        }
      }

      logger.info(`成功解析 ${validDecisions.length} 个交易决策`);
      return validDecisions;
    } catch (error) {
      logger.error('解析交易决策失败', { content, error });
      return [];
    }
  }

  /**
   * 解析反思结果
   */
  static parseReflection(content: string): ReflectionOutput {
    try {
      const jsonStr = this.extractJSON(content);
      if (!jsonStr) {
        logger.warn('未找到 JSON 内容', { content });
        return this.getDefaultReflection();
      }

      const parsed = this.safeJSONParse<any>(jsonStr);
      if (!parsed) {
        return this.getDefaultReflection();
      }

      // 验证必需字段
      if (!parsed.content || typeof parsed.score !== 'number') {
        logger.warn('反思结果缺少必需字段', { parsed });
        return this.getDefaultReflection();
      }

      return {
        content: parsed.content,
        score: this.clamp(Math.round(parsed.score), 1, 10),
      };
    } catch (error) {
      logger.error('解析反思结果失败', { content, error });
      return this.getDefaultReflection();
    }
  }

  /**
   * 解析股票推荐
   */
  static parseStockRecommendations(content: string): StockRecommendation[] {
    try {
      const jsonStr = this.extractJSON(content);
      if (!jsonStr) {
        logger.warn('未找到 JSON 内容', { content });
        return [];
      }

      const parsed = this.safeJSONParse<any>(jsonStr);
      if (!parsed) {
        return [];
      }

      // 确保返回的是数组
      const recommendations = Array.isArray(parsed) ? parsed : [parsed];

      // 验证并过滤有效的推荐
      const validRecommendations: StockRecommendation[] = [];
      for (const rec of recommendations) {
        if (this.validateStockRecommendation(rec)) {
          validRecommendations.push({
            symbol: rec.symbol,
            name: rec.name,
            reason: rec.reason,
            score: this.clamp(Math.round(rec.score), 0, 100),
          });
        } else {
          logger.warn('无效的股票推荐', { rec });
        }
      }

      logger.info(`成功解析 ${validRecommendations.length} 个股票推荐`);
      return validRecommendations;
    } catch (error) {
      logger.error('解析股票推荐失败', { content, error });
      return [];
    }
  }

  /**
   * 解析单一股票分析
   */
  static parseSingleStockAnalysis(content: string): SingleStockAnalysisOutput {
    try {
      const jsonStr = this.extractJSON(content);
      if (!jsonStr) {
        logger.warn('未找到 JSON 内容', { content });
        throw new Error('无法从 LLM 响应中提取 JSON');
      }

      const parsed = this.safeJSONParse<any>(jsonStr);
      if (!parsed) {
        throw new Error('JSON 解析失败');
      }

      // 验证必需字段
      if (!this.validateSingleStockAnalysis(parsed)) {
        logger.warn('单一股票分析结果缺少必需字段', { parsed });
        throw new Error('分析结果格式不正确');
      }

      return {
        symbol: parsed.symbol,
        name: parsed.name,
        score: this.clamp(parsed.score, 0, 10),
        analysis: parsed.analysis,
        recommendation: parsed.recommendation as '买入' | '观望' | '卖出',
        reason: parsed.reason,
      };
    } catch (error) {
      logger.error('解析单一股票分析失败', { content, error });
      throw error;
    }
  }

  // ========== 私有辅助方法 ==========

  /**
   * 验证交易决策的必需字段
   */
  private static validateTradeDecision(decision: any): boolean {
    return (
      decision &&
      typeof decision.symbol === 'string' &&
      typeof decision.action === 'string' &&
      ['BUY', 'SELL', 'HOLD'].includes(decision.action.toUpperCase()) &&
      typeof decision.positionSize === 'number' &&
      typeof decision.rationale === 'string' &&
      typeof decision.confidence === 'number'
    );
  }

  /**
   * 验证股票推荐的必需字段
   */
  private static validateStockRecommendation(rec: any): boolean {
    return (
      rec &&
      typeof rec.symbol === 'string' &&
      typeof rec.name === 'string' &&
      typeof rec.reason === 'string' &&
      typeof rec.score === 'number'
    );
  }

  /**
   * 验证单一股票分析的必需字段
   */
  private static validateSingleStockAnalysis(analysis: any): boolean {
    return (
      analysis &&
      typeof analysis.symbol === 'string' &&
      typeof analysis.name === 'string' &&
      typeof analysis.score === 'number' &&
      typeof analysis.analysis === 'string' &&
      typeof analysis.recommendation === 'string' &&
      ['买入', '观望', '卖出'].includes(analysis.recommendation) &&
      typeof analysis.reason === 'string'
    );
  }

  /**
   * 将数值限制在指定范围内
   */
  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 获取默认的反思结果
   */
  private static getDefaultReflection(): ReflectionOutput {
    return {
      content: 'AI 未能生成有效的反思内容。',
      score: 1,
    };
  }
}

