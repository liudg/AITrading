// 战报生成服务

import { PrismaClient } from '@prisma/client';
import { PortfolioService } from './portfolio.service';

const prisma = new PrismaClient();

export interface DailyReportData {
  day: number;
  date: Date;
  title: string;
  summary?: string;
  overallInsight?: string;
  modelPerformances: ModelPerformanceData[];
}

export interface ModelPerformanceData {
  modelId: string;
  modelName: string;
  totalValue: number;
  returnAmount: number;
  returnPct: number;
  dailyReturn?: number;
  dailyReturnPct?: number;
  cashRatio: number;
  positionRatio: number;
  rankChange?: number;
  positionsCount: number;
  positionsDetail: any[];
  tradesCount: number;
  buyCount: number;
  sellCount: number;
  winRate?: number;
  bestTrade?: any;
  worstTrade?: any;
  todayTrades?: any[];  // 当日所有交易
  todayBestTradeId?: string | null;  // 当日最佳交易ID
  todayWorstTradeId?: string | null;  // 当日最差交易ID
  strategyAnalysis?: string;
  keyInsights?: string[];
}

export class ReportService {
  private portfolioService: PortfolioService;

  constructor() {
    this.portfolioService = new PortfolioService();
  }

  /**
   * 生成每日战报
   */
  async generateDailyReport(date?: Date): Promise<string> {
    const reportDate = date || new Date();
    
    console.log(`[ReportService] Generating daily report for ${reportDate.toISOString().split('T')[0]}`);

    try {
      // 1. 计算当前是第几天
      const existingReports = await prisma.dailyReport.count();
      const dayNumber = existingReports + 1;

      // 2. 获取所有启用的模型
      const models = await prisma.model.findMany({
        where: { enabled: true },
        include: {
          portfolio: true,
        },
      });

      if (models.length === 0) {
        throw new Error('No active models found');
      }

      // 3. 获取昨天的战报（用于计算排名变化）
      const yesterdayReport = await prisma.dailyReport.findUnique({
        where: { day: dayNumber - 1 },
        include: {
          modelPerformances: {
            orderBy: { returnPct: 'desc' }
          }
        }
      });

      // 构建昨日排名映射
      const yesterdayRankMap = new Map<string, number>();
      if (yesterdayReport) {
        yesterdayReport.modelPerformances.forEach((perf, index) => {
          yesterdayRankMap.set(perf.modelId, index + 1);
        });
      }

      // 4. 收集每个模型的表现数据
      const modelPerformances: ModelPerformanceData[] = [];

      for (const model of models) {
        if (!model.portfolio) {
          console.warn(`[ReportService] Model ${model.name} has no portfolio, skipping`);
          continue;
        }

        const performance = await this.collectModelPerformance(model.id, model.name, reportDate);
        modelPerformances.push(performance);
      }

      // 5. 计算排名并添加排名变化
      const sortedPerformances = [...modelPerformances].sort((a, b) => b.returnPct - a.returnPct);
      sortedPerformances.forEach((perf, index) => {
        const currentRank = index + 1;
        const yesterdayRank = yesterdayRankMap.get(perf.modelId);
        if (yesterdayRank !== undefined) {
          perf.rankChange = yesterdayRank - currentRank; // 正数=上升，负数=下降
        }
      });

      // 6. 生成整体洞察
      const overallInsight = this.generateOverallInsight(sortedPerformances);

      // 7. 生成持仓分布统计
      const stockDistributions = await this.calculateStockDistributions(
        sortedPerformances,
        reportDate,
        dayNumber
      );

      // 8. 创建战报记录
      const report = await prisma.dailyReport.create({
        data: {
          day: dayNumber,
          date: reportDate,
          title: `Day ${dayNumber} 战报：6大AI模型表现对比 • 策略分析与关键洞察`,
          summary: this.generateSummary(modelPerformances),
          overallInsight,
          modelPerformances: {
            create: sortedPerformances.map((perf) => ({
              modelId: perf.modelId,
              totalValue: perf.totalValue,
              returnAmount: perf.returnAmount,
              returnPct: perf.returnPct,
              dailyReturn: perf.dailyReturn,
              dailyReturnPct: perf.dailyReturnPct,
              cashRatio: perf.cashRatio,
              positionRatio: perf.positionRatio,
              rankChange: perf.rankChange,
              positionsCount: perf.positionsCount,
              positionsDetail: JSON.stringify(perf.positionsDetail),
              tradesCount: perf.tradesCount,
              buyCount: perf.buyCount,
              sellCount: perf.sellCount,
              winRate: perf.winRate,
              bestTrade: perf.bestTrade ? JSON.stringify(perf.bestTrade) : null,
              worstTrade: perf.worstTrade ? JSON.stringify(perf.worstTrade) : null,
              todayTrades: perf.todayTrades && perf.todayTrades.length > 0 
                ? JSON.stringify({
                    trades: perf.todayTrades,
                    bestTradeId: perf.todayBestTradeId,
                    worstTradeId: perf.todayWorstTradeId,
                  })
                : null,
              strategyAnalysis: perf.strategyAnalysis,
              keyInsights: perf.keyInsights ? JSON.stringify(perf.keyInsights) : null,
            })),
          },
          stockDistributions: {
            create: stockDistributions.map((dist) => ({
              symbol: dist.symbol,
              holdingAICount: dist.holdingAICount,
              totalShares: dist.totalShares,
              totalValue: dist.totalValue,
              totalPnL: dist.totalPnL,
              holders: JSON.stringify(dist.holders),
              changes: dist.changes && dist.changes.length > 0 ? JSON.stringify(dist.changes) : null,
            })),
          },
        },
        include: {
          modelPerformances: {
            include: {
              model: true,
            },
          },
          stockDistributions: true,
        },
      });

      console.log(`[ReportService] Daily report created: Day ${dayNumber}, ID: ${report.id}`);

      return report.id;
    } catch (error: any) {
      console.error('[ReportService] Failed to generate daily report:', error);
      throw error;
    }
  }

  /**
   * 收集单个模型的表现数据
   */
  private async collectModelPerformance(
    modelId: string,
    modelName: string,
    date: Date
  ): Promise<ModelPerformanceData> {
    // 获取投资组合状态
    const portfolio = await this.portfolioService.getPortfolioStatus(modelId);

    // 获取投资组合记录（需要 portfolioId）
    const portfolioRecord = await prisma.portfolio.findUnique({
      where: { modelId },
    });

    if (!portfolioRecord) {
      throw new Error(`Portfolio not found for model ${modelId}`);
    }

    // 获取持仓详情
    const positions = await prisma.position.findMany({
      where: { portfolioId: portfolioRecord.id },
    });

    const positionsDetail = positions.map((pos) => ({
      symbol: pos.symbol,
      quantity: pos.quantity,
      avgPrice: pos.avgPrice,
      currentPrice: pos.currentPrice,
      marketValue: pos.marketValue,
      unrealizedPnL: pos.unrealizedPnL,
      unrealizedPnLPct: ((pos.unrealizedPnL / (pos.avgPrice * pos.quantity)) * 100).toFixed(2),
    }));

    // 获取当日交易记录
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const todayTrades = await prisma.trade.findMany({
      where: {
        modelId,
        executedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        executedAt: 'asc',
      },
    });

    const buyCount = todayTrades.filter((t) => t.side === 'BUY').length;
    const sellCount = todayTrades.filter((t) => t.side === 'SELL').length;

    // 计算胜率（基于已平仓交易）
    const closedTrades = await prisma.trade.findMany({
      where: {
        modelId,
        status: 'CLOSED',
        pnl: { not: null },
      },
    });

    const winRate = closedTrades.length > 0
      ? (closedTrades.filter((t) => (t.pnl || 0) > 0).length / closedTrades.length) * 100
      : undefined;

    // 找出全局最佳和最差交易
    const sortedByPnl = [...closedTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
    const bestTrade = sortedByPnl[0]
      ? {
          symbol: sortedByPnl[0].symbol,
          side: sortedByPnl[0].side,
          pnl: sortedByPnl[0].pnl,
          rationale: sortedByPnl[0].rationale,
        }
      : undefined;

    const worstTrade = sortedByPnl[sortedByPnl.length - 1]
      ? {
          symbol: sortedByPnl[sortedByPnl.length - 1].symbol,
          side: sortedByPnl[sortedByPnl.length - 1].side,
          pnl: sortedByPnl[sortedByPnl.length - 1].pnl,
          rationale: sortedByPnl[sortedByPnl.length - 1].rationale,
        }
      : undefined;

    // 收集当日所有交易（包括未平仓），按时间排序
    const allTodayTrades = todayTrades.map((trade) => {
      // 对于未平仓交易，计算浮动盈亏
      let pnl = trade.pnl;
      let pnlPct = null;
      
      if (trade.status !== 'CLOSED' && trade.side === 'BUY') {
        // 查找对应的持仓来获取当前价格
        const position = positions.find(p => p.symbol === trade.symbol);
        if (position) {
          pnl = (position.currentPrice - trade.price) * trade.quantity;
          pnlPct = ((position.currentPrice - trade.price) / trade.price) * 100;
        }
      }
      
      return {
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        price: trade.price,
        amount: trade.amount,
        pnl,
        pnlPct,
        rationale: trade.rationale,
        status: trade.status,
        executedAt: trade.executedAt,
      };
    }).sort((a, b) => {
      // 按执行时间排序
      const timeA = a.executedAt ? new Date(a.executedAt).getTime() : 0;
      const timeB = b.executedAt ? new Date(b.executedAt).getTime() : 0;
      return timeA - timeB;
    });

    // 找出当日最佳和最差交易（仅已平仓的）
    const todayClosedTrades = allTodayTrades.filter(t => t.status === 'CLOSED' && t.pnl !== null);
    let bestTradeId = null;
    let worstTradeId = null;
    
    if (todayClosedTrades.length > 0) {
      const sortedByPnl = [...todayClosedTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
      bestTradeId = sortedByPnl[0].id;
      worstTradeId = sortedByPnl[sortedByPnl.length - 1].id;
    }

    // 获取昨日总资产，计算当日收益
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySnapshot = await prisma.portfolioSnapshot.findFirst({
      where: {
        portfolioId: portfolioRecord.id,
        timestamp: {
          gte: new Date(yesterday.setHours(0, 0, 0, 0)),
          lte: new Date(yesterday.setHours(23, 59, 59, 999)),
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    const dailyReturn = yesterdaySnapshot
      ? portfolio.totalValue - yesterdaySnapshot.totalValue
      : undefined;
    const dailyReturnPct = yesterdaySnapshot
      ? ((dailyReturn || 0) / yesterdaySnapshot.totalValue) * 100
      : undefined;

    // 生成策略分析
    const strategyAnalysis = this.generateStrategyAnalysis(modelName, {
      positions: positionsDetail,
      trades: todayTrades,
      performance: portfolio.performance,
    });

    // 生成关键洞察
    const keyInsights = this.generateKeyInsights(modelName, {
      returnPct: portfolio.performance.totalReturnPct,
      dailyReturnPct,
      winRate,
      positionsCount: positions.length,
      tradesCount: todayTrades.length,
    });

    // 计算现金比例和仓位比例
    const cashRatio = (portfolio.cash / portfolio.totalValue) * 100;
    const positionRatio = 100 - cashRatio;

    return {
      modelId,
      modelName,
      totalValue: portfolio.totalValue,
      returnAmount: portfolio.performance.totalReturn,
      returnPct: portfolio.performance.totalReturnPct,
      dailyReturn,
      dailyReturnPct,
      cashRatio,
      positionRatio,
      rankChange: undefined, // 会在外部计算
      positionsCount: positions.length,
      positionsDetail,
      tradesCount: todayTrades.length,
      buyCount,
      sellCount,
      winRate,
      bestTrade,
      worstTrade,
      todayTrades: allTodayTrades,
      todayBestTradeId: bestTradeId,
      todayWorstTradeId: worstTradeId,
      strategyAnalysis,
      keyInsights,
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(performances: ModelPerformanceData[]): string {
    const sorted = [...performances].sort((a, b) => b.returnPct - a.returnPct);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    return `今日共有${performances.length}个AI模型参与交易。表现最佳的是${best.modelName}，收益率${best.returnPct.toFixed(2)}%；${worst.modelName}表现相对较弱，收益率${worst.returnPct.toFixed(2)}%。整体而言，市场${performances.filter(p => p.returnPct > 0).length > performances.length / 2 ? '呈现上涨趋势' : '表现震荡'}。`;
  }

  /**
   * 生成整体洞察
   */
  private generateOverallInsight(performances: ModelPerformanceData[]): string {
    const avgReturn = performances.reduce((sum, p) => sum + p.returnPct, 0) / performances.length;
    const totalTrades = performances.reduce((sum, p) => sum + p.tradesCount, 0);

    let insight = `本交易日${performances.length}个AI模型平均收益率为${avgReturn.toFixed(2)}%，`;
    insight += `共执行${totalTrades}笔交易。`;

    if (avgReturn > 2) {
      insight += ' 整体表现优异，多数模型把握住了市场机会。';
    } else if (avgReturn > 0) {
      insight += ' 市场表现平稳，各模型策略稳健。';
    } else {
      insight += ' 市场波动较大，各模型采取谨慎策略。';
    }

    return insight;
  }

  /**
   * 生成策略分析
   */
  private generateStrategyAnalysis(modelName: string, data: any): string {
    const { positions, trades, performance } = data;

    let analysis = `${modelName}当前持有${positions.length}个仓位，`;

    if (trades.length > 0) {
      analysis += `今日执行${trades.length}笔交易。`;
    } else {
      analysis += '今日暂无交易，保持观望。';
    }

    if (performance.totalReturnPct > 5) {
      analysis += ' 该模型表现出色，投资策略成效显著。';
    } else if (performance.totalReturnPct > 0) {
      analysis += ' 该模型保持稳健盈利。';
    } else {
      analysis += ' 该模型正在调整策略以应对市场变化。';
    }

    return analysis;
  }

  /**
   * 生成关键洞察
   */
  private generateKeyInsights(modelName: string, metrics: any): string[] {
    const insights: string[] = [];

    if (metrics.returnPct > 10) {
      insights.push(`累计收益率突破10%，达到${metrics.returnPct.toFixed(2)}%`);
    }

    if (metrics.dailyReturnPct !== undefined && metrics.dailyReturnPct > 5) {
      insights.push(`单日收益率高达${metrics.dailyReturnPct.toFixed(2)}%，表现强劲`);
    }

    if (metrics.winRate !== undefined && metrics.winRate > 70) {
      insights.push(`交易胜率达到${metrics.winRate.toFixed(2)}%，决策准确度高`);
    }

    if (metrics.tradesCount > 5) {
      insights.push(`交易频率较高，采用积极的交易策略`);
    } else if (metrics.tradesCount === 0) {
      insights.push('暂无交易，采取观望策略');
    }

    if (insights.length === 0) {
      insights.push('策略稳健，持续观察市场动向');
    }

    return insights;
  }

  /**
   * 计算持仓分布统计
   */
  private async calculateStockDistributions(
    performances: ModelPerformanceData[],
    date: Date,
    dayNumber: number
  ): Promise<any[]> {
    // 1. 收集所有股票的持仓情况
    const stockMap = new Map<string, any>();

    for (const perf of performances) {
      const modelName = perf.modelName;
      
      // 当前持仓
      for (const pos of perf.positionsDetail) {
        if (!stockMap.has(pos.symbol)) {
          stockMap.set(pos.symbol, {
            symbol: pos.symbol,
            holders: [],
            clearedToday: new Set<string>(),
          });
        }
        
        stockMap.get(pos.symbol).holders.push({
          modelName,
          shares: pos.quantity,
          avgPrice: pos.avgPrice,
          currentPrice: pos.currentPrice,
          pnl: pos.unrealizedPnL,
        });
      }
      
      // 检查当日清仓的股票（卖出但不再持有）
      if (perf.todayTrades) {
        for (const trade of perf.todayTrades) {
          if (trade.side === 'SELL' || trade.status === 'CLOSED') {
            const hasPosition = perf.positionsDetail.some(p => p.symbol === trade.symbol);
            if (!hasPosition) {
              // 当日已清仓
              if (!stockMap.has(trade.symbol)) {
                stockMap.set(trade.symbol, {
                  symbol: trade.symbol,
                  holders: [],
                  clearedToday: new Set<string>(),
                });
              }
              stockMap.get(trade.symbol).clearedToday.add(modelName);
            }
          }
        }
      }
    }

    // 2. 获取昨天的持仓分布（用于对比变化）
    let yesterdayDistributions = new Map<string, Set<string>>();
    if (dayNumber > 1) {
      const yesterdayReport = await prisma.dailyReport.findUnique({
        where: { day: dayNumber - 1 },
        include: {
          stockDistributions: true,
        },
      });
      
      if (yesterdayReport) {
        for (const dist of yesterdayReport.stockDistributions) {
          const holders = JSON.parse(dist.holders);
          const holderNames: Set<string> = new Set(holders.map((h: any) => h.modelName));
          yesterdayDistributions.set(dist.symbol, holderNames);
        }
      }
    }

    // 3. 计算每只股票的统计数据和变化
    const distributions: any[] = [];
    
    for (const [symbol, data] of stockMap) {
      const holders = data.holders;
      const clearedToday = data.clearedToday;
      
      const holdingAICount = holders.length;
      const totalShares = holders.reduce((sum: number, h: any) => sum + h.shares, 0);
      const totalValue = holders.reduce((sum: number, h: any) => sum + (h.shares * h.currentPrice), 0);
      const totalPnL = holders.reduce((sum: number, h: any) => sum + h.pnl, 0);
      
      // 计算变化
      const changes: any[] = [];
      const todayHolders: Set<string> = new Set(holders.map((h: any) => h.modelName));
      const yesterdayHolders: Set<string> = yesterdayDistributions.get(symbol) || new Set<string>();
      
      // 新增持仓
      for (const modelName of todayHolders) {
        if (!yesterdayHolders.has(modelName)) {
          changes.push({ modelName, action: 'NEW' });
        }
      }
      
      // 清仓
      for (const modelName of yesterdayHolders) {
        if (!todayHolders.has(modelName)) {
          changes.push({ modelName, action: 'CLOSED' });
        }
      }
      
      // 当日清仓（今天还交易了但最终清仓了）
      for (const modelName of clearedToday) {
        if (!changes.some(c => c.modelName === modelName && c.action === 'CLOSED')) {
          changes.push({ modelName, action: 'CLOSED' });
        }
      }
      
      distributions.push({
        symbol,
        holdingAICount,
        totalShares,
        totalValue,
        totalPnL,
        holders,
        changes,
      });
    }

    // 4. 按持有AI数量降序排序
    distributions.sort((a, b) => b.holdingAICount - a.holdingAICount);
    
    return distributions;
  }

  /**
   * 获取战报列表
   */
  async getReportsList(limit: number = 20): Promise<any[]> {
    const reports = await prisma.dailyReport.findMany({
      orderBy: {
        day: 'desc',
      },
      take: limit,
    });

    return reports.map((report) => ({
      id: report.id,
      day: report.day,
      date: report.date,
      title: report.title,
      summary: report.summary,
    }));
  }

  /**
   * 获取战报详情
   */
  async getReportDetail(reportId: string): Promise<any> {
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        modelPerformances: {
          include: {
            model: true,
          },
          orderBy: {
            returnPct: 'desc',
          },
        },
        stockDistributions: {
          orderBy: {
            holdingAICount: 'desc',
          },
        },
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // 解析 JSON 字段
    const performances = report.modelPerformances.map((perf) => {
      const todayTradesData = perf.todayTrades ? JSON.parse(perf.todayTrades) : null;
      
      return {
        ...perf,
        positionsDetail: perf.positionsDetail ? JSON.parse(perf.positionsDetail) : [],
        bestTrade: perf.bestTrade ? JSON.parse(perf.bestTrade) : null,
        worstTrade: perf.worstTrade ? JSON.parse(perf.worstTrade) : null,
        todayTrades: todayTradesData?.trades || [],
        todayBestTradeId: todayTradesData?.bestTradeId || null,
        todayWorstTradeId: todayTradesData?.worstTradeId || null,
        keyInsights: perf.keyInsights ? JSON.parse(perf.keyInsights) : [],
        modelName: perf.model.displayName,
      };
    });

    // 解析持仓分布 JSON 字段
    const stockDistributions = report.stockDistributions.map((dist) => ({
      ...dist,
      holders: dist.holders ? JSON.parse(dist.holders) : [],
      changes: dist.changes ? JSON.parse(dist.changes) : [],
    }));

    return {
      ...report,
      modelPerformances: performances,
      stockDistributions,
    };
  }

  /**
   * 根据 Day 编号获取战报
   */
  async getReportByDay(day: number): Promise<any> {
    const report = await prisma.dailyReport.findUnique({
      where: { day },
      include: {
        modelPerformances: {
          include: {
            model: true,
          },
          orderBy: {
            returnPct: 'desc',
          },
        },
      },
    });

    if (!report) {
      throw new Error(`Report for Day ${day} not found`);
    }

    // 解析 JSON 字段
    const performances = report.modelPerformances.map((perf) => {
      const todayTradesData = perf.todayTrades ? JSON.parse(perf.todayTrades) : null;
      
      return {
        ...perf,
        positionsDetail: perf.positionsDetail ? JSON.parse(perf.positionsDetail) : [],
        bestTrade: perf.bestTrade ? JSON.parse(perf.bestTrade) : null,
        worstTrade: perf.worstTrade ? JSON.parse(perf.worstTrade) : null,
        todayTrades: todayTradesData?.trades || [],
        todayBestTradeId: todayTradesData?.bestTradeId || null,
        todayWorstTradeId: todayTradesData?.worstTradeId || null,
        keyInsights: perf.keyInsights ? JSON.parse(perf.keyInsights) : [],
        modelName: perf.model.displayName,
      };
    });

    return {
      ...report,
      modelPerformances: performances,
    };
  }
}

