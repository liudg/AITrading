// Mock 数据适配器 (用于开发和演示)

import { IMarketDataProvider, INewsDataProvider } from './interface';
import { MarketDataPoint, NewsItem } from '../../types';

/**
 * Mock 市场数据提供商
 */
export class MockMarketDataProvider implements IMarketDataProvider {
  async getMarketData(symbols: string[], days: number = 30): Promise<Record<string, MarketDataPoint[]>> {
    const result: Record<string, MarketDataPoint[]> = {};

    for (const symbol of symbols) {
      const data: MarketDataPoint[] = [];
      let basePrice = this.getBasePrice(symbol);

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        // 模拟价格波动
        const change = (Math.random() - 0.5) * 0.05; // ±2.5%
        basePrice *= 1 + change;

        const open = basePrice * (1 + (Math.random() - 0.5) * 0.02);
        const close = basePrice * (1 + (Math.random() - 0.5) * 0.02);
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);
        const volume = Math.floor(Math.random() * 50000000) + 10000000;

        data.push({
          symbol,
          date,
          open,
          high,
          low,
          close,
          volume,
        });
      }

      result[symbol] = data;
    }

    return result;
  }

  async getCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    for (const symbol of symbols) {
      result[symbol] = this.getBasePrice(symbol) * (1 + (Math.random() - 0.5) * 0.02);
    }

    return result;
  }

  private getBasePrice(symbol: string): number {
    // 为不同股票设置不同的基准价格
    const basePrices: Record<string, number> = {
      NVDA: 480,
      TSLA: 240,
      AAPL: 180,
      MSFT: 380,
      GOOGL: 140,
      META: 350,
      AMZN: 155,
      AMD: 145,
      NFLX: 480,
      BABA: 85,
    };

    return basePrices[symbol] || 100;
  }
}

/**
 * Mock 新闻数据提供商
 */
export class MockNewsDataProvider implements INewsDataProvider {
  async getNews(symbols?: string[], hours: number = 24): Promise<NewsItem[]> {
    const news: NewsItem[] = [];

    // 为每个股票生成 2-3 条新闻
    const targetSymbols = symbols || ['SPY']; // 如果没有指定股票，生成大盘新闻

    for (const symbol of targetSymbols) {
      const newsCount = Math.floor(Math.random() * 2) + 2;

      for (let i = 0; i < newsCount; i++) {
        const sentiment = this.getRandomSentiment();
        news.push({
          symbol: symbol === 'SPY' ? undefined : symbol,
          title: this.generateNewsTitle(symbol, sentiment),
          summary: this.generateNewsSummary(symbol, sentiment),
          sentiment,
          source: this.getRandomSource(),
          url: `https://example.com/news/${symbol.toLowerCase()}-${i}`,
          publishedAt: new Date(Date.now() - Math.random() * hours * 60 * 60 * 1000),
        });
      }
    }

    return news.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  private getRandomSentiment(): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    const rand = Math.random();
    if (rand < 0.4) return 'POSITIVE';
    if (rand < 0.7) return 'NEUTRAL';
    return 'NEGATIVE';
  }

  private getRandomSource(): string {
    const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times', 'MarketWatch'];
    return sources[Math.floor(Math.random() * sources.length)];
  }

  private generateNewsTitle(symbol: string, sentiment: string): string {
    const companyNames: Record<string, string> = {
      NVDA: 'NVIDIA',
      TSLA: 'Tesla',
      AAPL: 'Apple',
      MSFT: 'Microsoft',
      GOOGL: 'Google',
      META: 'Meta',
      AMZN: 'Amazon',
      AMD: 'AMD',
      NFLX: 'Netflix',
      BABA: 'Alibaba',
      SPY: 'Market',
    };

    const name = companyNames[symbol] || symbol;

    if (sentiment === 'POSITIVE') {
      const titles = [
        `${name} Beats Earnings Expectations, Stock Surges`,
        `${name} Announces Major Partnership Deal`,
        `Analysts Upgrade ${name} to 'Strong Buy'`,
        `${name} Reports Record Revenue Growth`,
        `${name} Unveils Revolutionary New Product`,
      ];
      return titles[Math.floor(Math.random() * titles.length)];
    } else if (sentiment === 'NEGATIVE') {
      const titles = [
        `${name} Faces Regulatory Scrutiny`,
        `${name} Misses Quarterly Targets`,
        `Concerns Rise Over ${name}'s Future Growth`,
        `${name} Stock Tumbles on Weak Guidance`,
        `${name} Announces Workforce Reduction`,
      ];
      return titles[Math.floor(Math.random() * titles.length)];
    } else {
      const titles = [
        `${name} Maintains Steady Performance`,
        `Analysts Hold Neutral Stance on ${name}`,
        `${name} Trading Sideways Amid Market Uncertainty`,
        `${name} Awaits Key Earnings Report`,
      ];
      return titles[Math.floor(Math.random() * titles.length)];
    }
  }

  private generateNewsSummary(symbol: string, sentiment: string): string {
    if (sentiment === 'POSITIVE') {
      return `Strong quarterly results exceeded analyst expectations, driven by robust demand and operational efficiency. Management expressed confidence in continued growth momentum.`;
    } else if (sentiment === 'NEGATIVE') {
      return `Disappointing quarterly performance fell short of market expectations. Challenges include increased competition, rising costs, and macroeconomic headwinds.`;
    } else {
      return `The company reported results in line with expectations. Market participants await further catalysts before taking decisive positions.`;
    }
  }
}

