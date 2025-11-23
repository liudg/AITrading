// 统一的 Prompt 构建器
// 所有提示词统一管理，便于修改和维护

import {
  ReflectionInput,
  StockPickerInput,
  SingleStockAnalysisInput,
} from "../../types";

/**
 * 分析上下文类型定义
 */
export interface AnalysisContext {
  stockPool: string[];
  marketData: Record<string, any>;
  newsData: any[];
  portfolio: {
    cash: number;
    totalValue: number;
    positions: Array<{
      symbol: string;
      quantity: number;
      avgPrice: number;
      currentPrice: number;
      marketValue: number;
      unrealizedPnL: number;
    }>;
  };
  reflections: string[];
}

/**
 * Prompt 构建器
 */
export class PromptBuilder {
  /**
   * System Prompt - 市场分析
   */
  static readonly SYSTEM_PROMPT_ANALYSIS =
    "你是一位专业的 AI 交易员，擅长分析市场数据和新闻，做出明智的交易决策。";

  /**
   * System Prompt - 交易反思
   */
  static readonly SYSTEM_PROMPT_REFLECTION =
    "你是一位资深交易员，善于从过往交易中总结经验教训。";

  /**
   * System Prompt - AI 选股
   */
  static readonly SYSTEM_PROMPT_PICKER =
    "你是一位资深股票分析师，根据用户的筛选条件推荐最合适的股票。";

  /**
   * System Prompt - 单一股票分析
   */
  static readonly SYSTEM_PROMPT_SINGLE_STOCK =
    "你是一位专业的股票分析师，擅长从技术面、基本面、市场情绪等多角度分析股票投资价值。";

  /**
   * 构建交易分析提示词
   */
  static buildAnalysisPrompt(context: AnalysisContext): string {
    return `
      你是一位专业的 AI 交易员，负责管理投资组合。请分析当前市场情况并做出交易决策。

      ## 当前投资组合
      - 现金：$${context.portfolio.cash.toFixed(2)}
      - 总资产价值：$${context.portfolio.totalValue.toFixed(2)}
      - 持仓：${JSON.stringify(context.portfolio.positions, null, 2)}

      ## 股票池
      ${context.stockPool.join("、")}

      ## 市场数据（最近价格）
      ${JSON.stringify(context.marketData, null, 2)}

      ## 最新新闻与市场情绪
      ${JSON.stringify(context.newsData, null, 2)}

      ## 你的历史反思经验（过往教训）
      ${
        context.reflections.length > 0
          ? context.reflections.join("\n\n")
          : "暂无历史反思记录。"
      }

      ## 交易约束
      - 单只股票最大持仓：总资产的 20%
      - 股票总持仓上限：总资产的 80%（至少保留 20% 现金）
      - 只能交易股票池中的股票

      ## 任务要求
      根据以上信息，决定要买入（BUY）、卖出（SELL）或持有（HOLD）哪些股票。对于每个决策，请提供：
      1. Symbol（股票代码）
      2. Action（操作：BUY/SELL/HOLD）
      3. Position Size（持仓比例：0-1 之间的数字，代表该股票占总资产的百分比）
      4. Rationale（决策理由：你的详细分析）
      5. Confidence（置信度：0-1 之间的数字）

      **输出格式（JSON 数组）：**
      [
        {
          "symbol": "NVDA",
          "action": "BUY",
          "positionSize": 0.15,
          "rationale": "英伟达财报超预期，市场情绪积极，AI 芯片需求强劲...",
          "confidence": 0.85
        },
        {
          "symbol": "TSLA",
          "action": "HOLD",
          "positionSize": 0.10,
          "rationale": "特斯拉当前估值合理，等待更明确的市场信号...",
          "confidence": 0.70
        }
      ]

      请直接返回 JSON 数组，不要添加其他说明文字。
      `;
  }

  /**
   * 构建交易反思提示词
   */
  static buildReflectionPrompt(input: ReflectionInput): string {
    return `
      你之前做出了一个交易决策。现在请回顾这笔交易的结果，并总结经验教训。

      ## 交易详情
      - 股票代码：${input.symbol}
      - 操作类型：${input.side === "BUY" ? "买入" : "卖出"}
      - 交易数量：${input.quantity} 股
      - 买入价格：$${input.entryPrice.toFixed(2)}
      - 卖出价格：$${input.exitPrice.toFixed(2)}
      - 盈亏金额：$${input.pnl.toFixed(2)}（${input.pnlPct.toFixed(2)}%）

      ## 你当时的决策理由
      "${input.rationale}"

      ## 交易期间发生的事情
      - 价格变化：${input.marketContext.priceChange.toFixed(2)}%
      - 重要新闻事件：${input.marketContext.newsEvents.join("；")}

      ## 任务要求
      请反思这笔交易：
      - 什么地方做对了？
      - 什么地方做错了？
      - 你应该记住什么教训，以便在未来的交易中避免同样的错误或重复成功的经验？

      **输出格式（JSON 对象）：**
      {
        "content": "你的反思总结（2-3 句话，简洁明了）",
        "score": 7  // 1-10 分，表示这条经验的重要程度
      }

      请直接返回 JSON 对象，不要添加其他说明文字。
      `;
  }

  /**
   * 构建 AI 选股提示词
   */
  static buildStockPickerPrompt(input: StockPickerInput): string {
    return `
      你是一位资深的股票分析师。用户希望你根据特定条件推荐股票。

      ## 用户的筛选要求
      "${input.criteria}"

      ## 任务要求
      分析美国股票市场，推荐 ${input.maxResults} 只符合条件的股票。对于每只股票，请提供：
      1. Symbol（股票代码）
      2. Name（公司全称）
      3. Reason（推荐理由：为什么符合用户的筛选条件）
      4. Score（评分：0-100，表示与筛选条件的匹配程度）

      **输出格式（JSON 数组）：**
      [
        {
          "symbol": "NVDA",
          "name": "英伟达公司",
          "reason": "AI 芯片行业的领导者，营收增长强劲，市场份额持续扩大...",
          "score": 95
        },
        {
          "symbol": "MSFT",
          "name": "微软公司",
          "reason": "云计算业务增长稳健，AI 布局领先，财务状况优秀...",
          "score": 92
        }
      ]

      请直接返回 JSON 数组，不要添加其他说明文字。
      `;
  }

  /**
   * 构建单一股票分析提示词
   */
  static buildSingleStockAnalysisPrompt(
    input: SingleStockAnalysisInput
  ): string {
    const criteriaSection = input.criteria
      ? `\n## 分析维度要求\n${input.criteria}\n`
      : "";

    return `
      你是一位专业的股票分析师。用户希望你对特定股票进行深度分析。

      ## 股票代码
      ${input.symbol}
      ${criteriaSection}
      ## 任务要求
      请对该股票进行全面深入的分析，包括但不限于：
      
      ### 技术面分析
      - 价格趋势和形态
      - 均线系统
      - 技术指标（MACD、RSI等）
      - 成交量分析
      - 支撑位和阻力位

      ### 基本面分析
      - 公司业绩表现
      - 财务健康状况
      - 估值水平（PE、PB等）
      - 行业地位和竞争优势
      - 未来增长前景

      ### 市场情绪分析
      - 新闻面和消息面
      - 机构投资者动向
      - 社交媒体讨论热度
      - 行业趋势和政策环境

      ### 风险提示
      - 主要风险因素
      - 投资建议和注意事项

      请基于以上分析，给出：
      1. Symbol（股票代码）
      2. Name（公司名称）
      3. Score（综合评分：0-10分）
      4. Analysis（详细分析报告，使用换行符分段，内容详实）
      5. Recommendation（投资建议：买入/观望/卖出）
      6. Reason（建议理由：简明扼要说明为什么给出这个建议）

      **输出格式（JSON 对象）：**
      {
        "symbol": "NVDA",
        "name": "英伟达公司",
        "score": 8.5,
        "analysis": "【技术面分析】\\n当前处于上升通道...\\n\\n【基本面分析】\\n公司业绩表现稳健...\\n\\n【市场情绪分析】\\n近期新闻面偏正面...\\n\\n【风险提示】\\n需关注宏观经济波动...",
        "recommendation": "买入",
        "reason": "综合考虑技术面、基本面和市场情绪，该股票当前具有较好的投资价值，建议逢低买入。"
      }

      请直接返回 JSON 对象，不要添加其他说明文字或markdown代码块标记。
      `;
  }
}
