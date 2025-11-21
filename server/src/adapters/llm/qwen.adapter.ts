// Qwen (DashScope) LLM 适配器

import axios from 'axios';
import { ILLMProvider, LLMConfig } from './interface';
import { TradeDecision, ReflectionInput, ReflectionOutput, StockPickerInput, StockRecommendation } from '../../types';

export class QwenAdapter implements ILLMProvider {
  private config: LLMConfig | null = null;

  initialize(config: LLMConfig): void {
    this.config = config;
  }

  async analyze(context: {
    stockPool: string[];
    marketData: Record<string, any>;
    newsData: any[];
    portfolio: any;
    reflections: string[];
  }): Promise<TradeDecision[]> {
    if (!this.config) {
      throw new Error('QwenAdapter not initialized');
    }

    const prompt = this.buildAnalysisPrompt(context);

    try {
      const response = await axios.post(
        this.config.apiUrl,
        {
          model: this.config.modelId,
          input: {
            messages: [
              {
                role: 'system',
                content: 'You are an expert AI trader. Analyze market data and news to make informed trading decisions.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 4000,
            result_format: 'message',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      );

      const content = response.data.output.choices[0].message.content;
      return this.parseDecisions(content);
    } catch (error: any) {
      console.error('Qwen API Error:', error.message);
      throw new Error(`Qwen analysis failed: ${error.message}`);
    }
  }

  async reflect(input: ReflectionInput): Promise<ReflectionOutput> {
    if (!this.config) {
      throw new Error('QwenAdapter not initialized');
    }

    const prompt = this.buildReflectionPrompt(input);

    try {
      const response = await axios.post(
        this.config.apiUrl,
        {
          model: this.config.modelId,
          input: {
            messages: [
              {
                role: 'system',
                content: 'You are an expert trader reflecting on past trades to extract valuable lessons.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          },
          parameters: {
            temperature: 0.8,
            max_tokens: 1000,
            result_format: 'message',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      );

      const content = response.data.output.choices[0].message.content;
      return this.parseReflection(content);
    } catch (error: any) {
      console.error('Qwen Reflection Error:', error.message);
      throw new Error(`Qwen reflection failed: ${error.message}`);
    }
  }

  async pickStocks(input: StockPickerInput): Promise<StockRecommendation[]> {
    if (!this.config) {
      throw new Error('QwenAdapter not initialized');
    }

    const prompt = this.buildStockPickerPrompt(input);

    try {
      const response = await axios.post(
        this.config.apiUrl,
        {
          model: this.config.modelId,
          input: {
            messages: [
              {
                role: 'system',
                content: 'You are an expert stock analyst. Recommend stocks based on user criteria.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 2000,
            result_format: 'message',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      );

      const content = response.data.output.choices[0].message.content;
      return this.parseStockRecommendations(content);
    } catch (error: any) {
      console.error('Qwen Stock Picker Error:', error.message);
      throw new Error(`Qwen stock picking failed: ${error.message}`);
    }
  }

  // ========== 私有方法：Prompt 构建（与 DeepSeek 相同）==========

  private buildAnalysisPrompt(context: any): string {
    return `
You are an AI trader managing a portfolio. Analyze the current market situation and make trading decisions.

## Current Portfolio
- Cash: $${context.portfolio.cash.toFixed(2)}
- Total Value: $${context.portfolio.totalValue.toFixed(2)}
- Positions: ${JSON.stringify(context.portfolio.positions, null, 2)}

## Stock Pool
${context.stockPool.join(', ')}

## Market Data (Recent Prices)
${JSON.stringify(context.marketData, null, 2)}

## Recent News & Sentiment
${JSON.stringify(context.newsData, null, 2)}

## Your Past Reflections (Lessons Learned)
${context.reflections.length > 0 ? context.reflections.join('\n\n') : 'No reflections yet.'}

## Constraints
- Maximum position size per stock: 20% of total portfolio
- Maximum total position: 80% (keep at least 20% cash)
- Only trade stocks in the stock pool

## Task
Based on the above information, decide which stocks to BUY, SELL, or HOLD. For each decision, provide:
1. Symbol
2. Action (BUY/SELL/HOLD)
3. Position Size (0-1, representing % of portfolio)
4. Rationale (your reasoning)
5. Confidence (0-1)

**Output format (JSON array):**
[
  {
    "symbol": "NVDA",
    "action": "BUY",
    "positionSize": 0.15,
    "rationale": "Strong earnings beat and positive sentiment...",
    "confidence": 0.85
  },
  ...
]
`;
  }

  private buildReflectionPrompt(input: ReflectionInput): string {
    return `
You previously made a trading decision. Now reflect on the outcome and extract lessons.

## Trade Details
- Symbol: ${input.symbol}
- Action: ${input.side}
- Quantity: ${input.quantity}
- Entry Price: $${input.entryPrice.toFixed(2)}
- Exit Price: $${input.exitPrice.toFixed(2)}
- P&L: $${input.pnl.toFixed(2)} (${input.pnlPct.toFixed(2)}%)

## Your Original Rationale
"${input.rationale}"

## What Happened During the Trade
- Price Change: ${input.marketContext.priceChange.toFixed(2)}%
- Key News Events: ${input.marketContext.newsEvents.join('; ')}

## Task
Reflect on this trade. What went well? What went wrong? What lesson should you remember for future trades?

**Output format (JSON):**
{
  "content": "Your reflection as a concise lesson (2-3 sentences)",
  "score": 7  // 1-10, importance of this lesson
}
`;
  }

  private buildStockPickerPrompt(input: StockPickerInput): string {
    return `
You are a stock analyst. The user wants you to recommend stocks based on specific criteria.

## User Request
"${input.criteria}"

## Task
Analyze the US stock market and recommend ${input.maxResults} stocks that match the criteria.
For each stock, provide:
1. Symbol (ticker)
2. Company Name
3. Reason (why it matches the criteria)
4. Score (0-100, how well it matches)

**Output format (JSON array):**
[
  {
    "symbol": "NVDA",
    "name": "NVIDIA Corporation",
    "reason": "Leading AI chip maker with strong revenue growth...",
    "score": 95
  },
  ...
]
`;
  }

  // ========== 私有方法：响应解析 ==========

  private parseDecisions(content: string): TradeDecision[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse decisions:', content);
      return [];
    }
  }

  private parseReflection(content: string): ReflectionOutput {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse reflection:', content);
      return {
        content: 'Failed to generate reflection.',
        score: 1,
      };
    }
  }

  private parseStockRecommendations(content: string): StockRecommendation[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse stock recommendations:', content);
      return [];
    }
  }
}

