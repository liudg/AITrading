// 前端类型定义

export interface Model {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  portfolio?: Portfolio;
}

export interface Portfolio {
  id: string;
  modelId: string;
  cash: number;
  totalValue: number;
  initialValue: number;
  positions: Position[];
  performance?: {
    totalReturn: number;
    totalReturnPct: number;
    dailyReturn: number;
    dailyReturnPct: number;
  };
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
}

export interface Trade {
  id: string;
  modelId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  amount: number;
  rationale: string;
  status: string;
  executedAt?: string;
  closedAt?: string;
  pnl?: number;
  avgCost?: number; // 平均成本价（用于卖出时显示）
  createdAt?: string;
  model?: Model;
  reflection?: Reflection;
}

export interface Reflection {
  id: string;
  tradeId: string;
  modelId: string;
  content: string;
  pnl: number;
  score: number;
  createdAt: string;
}

export interface StockRecommendation {
  symbol: string;
  name: string;
  reason: string;
  score: number;
}

export interface WSMessage {
  type: WSMessageType;
  payload: any;
  timestamp: string;
}

export enum WSMessageType {
  PORTFOLIO_UPDATE = 'portfolio_update',
  TRADE_EXECUTED = 'trade_executed',
  MODEL_THINKING = 'model_thinking',
  REFLECTION_CREATED = 'reflection_created',
  ERROR = 'error',
}

