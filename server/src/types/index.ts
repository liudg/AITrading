// 核心类型定义

export interface MarketDataPoint {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  symbol?: string;
  title: string;
  summary: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  source: string;
  url?: string;
  publishedAt: Date;
}

export interface TradeDecision {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  positionSize: number; // 0-1 之间，表示该标的占投资组合的比例
  rationale: string; // AI 的决策理由
  confidence: number; // 0-1 之间，置信度
}

export interface PortfolioStatus {
  modelId: string;
  modelName: string;
  cash: number;
  totalValue: number;
  positions: {
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnL: number;
  }[];
  performance: {
    totalReturn: number;
    totalReturnPct: number;
    dailyReturn: number;
    dailyReturnPct: number;
  };
}

export interface ReflectionInput {
  tradeId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  rationale: string; // 当时的决策理由
  marketContext: {
    priceChange: number; // 期间价格变化
    newsEvents: string[]; // 期间重要新闻
  };
}

export interface ReflectionOutput {
  content: string; // AI 生成的反思内容
  score: number; // 1-10，这条经验的重要性
}

export interface StockPickerInput {
  criteria: string; // 用户输入的筛选条件
  maxResults: number; // 返回多少只股票
}

export interface StockRecommendation {
  symbol: string;
  name: string;
  reason: string; // 推荐理由
  score: number; // 评分 0-100
}

export interface SingleStockAnalysisInput {
  symbol: string; // 股票代码
  criteria?: string; // 分析维度（可选）
}

export interface SingleStockAnalysisOutput {
  symbol: string;
  name: string;
  score: number; // 评分 0-10
  analysis: string; // 详细分析报告
  recommendation: '买入' | '观望' | '卖出'; // 投资建议
  reason: string; // 建议理由
}

// WebSocket 消息类型
export enum WSMessageType {
  PORTFOLIO_UPDATE = 'portfolio_update',
  TRADE_EXECUTED = 'trade_executed',
  MODEL_THINKING = 'model_thinking', // 流式输出模型思考过程
  REFLECTION_CREATED = 'reflection_created',
  ERROR = 'error',
}

export interface WSMessage {
  type: WSMessageType;
  payload: any;
  timestamp: Date;
}

