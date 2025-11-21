// 数据提供商统一接口

import { MarketDataPoint, NewsItem } from '../../types';

/**
 * 市场数据提供商接口
 */
export interface IMarketDataProvider {
  /**
   * 获取指定股票的最新市场数据
   * @param symbols 股票代码列表
   * @param days 获取最近几天的数据
   */
  getMarketData(symbols: string[], days?: number): Promise<Record<string, MarketDataPoint[]>>;

  /**
   * 获取当前价格
   * @param symbols 股票代码列表
   */
  getCurrentPrices(symbols: string[]): Promise<Record<string, number>>;
}

/**
 * 新闻数据提供商接口
 */
export interface INewsDataProvider {
  /**
   * 获取指定股票的最新新闻
   * @param symbols 股票代码列表（可选，为空则获取大盘新闻）
   * @param hours 获取最近几小时的新闻
   */
  getNews(symbols?: string[], hours?: number): Promise<NewsItem[]>;
}

