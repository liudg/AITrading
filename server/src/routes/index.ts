// API 路由

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PortfolioService } from '../services/portfolio.service';
import { StockPickerService } from '../services/stockpicker.service';
import { BrainService } from '../services/brain.service';
import { ReportService } from '../services/report.service';
import { DeepSeekAdapter } from '../adapters/llm/deepseek.adapter';
import { QwenAdapter } from '../adapters/llm/qwen.adapter';
import { MockMarketDataProvider, MockNewsDataProvider } from '../adapters/data/mock.adapter';

const router = Router();
const prisma = new PrismaClient();

// 初始化服务（这里使用 Mock 数据，后续可以替换为真实 API）
const portfolioService = new PortfolioService();
const marketDataProvider = new MockMarketDataProvider();
const newsDataProvider = new MockNewsDataProvider();
const reportService = new ReportService();

// DeepSeek 选股服务
const deepseekAdapter = new DeepSeekAdapter();
deepseekAdapter.initialize({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  apiUrl: process.env.DEEPSEEK_API_URL || '',
  modelId: 'deepseek-chat',
});
const stockPickerService = new StockPickerService(deepseekAdapter);

// ========== 模型管理 ==========

router.get('/models', async (req: Request, res: Response) => {
  try {
    const models = await prisma.model.findMany({
      where: { enabled: true },
      include: { portfolio: true },
    });
    res.json(models);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/models', async (req: Request, res: Response) => {
  try {
    const { name, displayName, apiConfig } = req.body;
    const model = await prisma.model.create({
      data: {
        name,
        displayName,
        apiConfig: JSON.stringify(apiConfig),
      },
    });

    // 初始化投资组合
    await portfolioService.initializePortfolio(model.id);

    res.json(model);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 投资组合 ==========

router.get('/portfolio/:modelId', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const portfolio = await portfolioService.getPortfolioStatus(modelId);
    res.json(portfolio);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/portfolio/:modelId/history', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const { hours = '72' } = req.query;
    const history = await portfolioService.getPortfolioHistory(modelId, parseInt(hours as string));
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 交易记录 ==========

router.get('/trades', async (req: Request, res: Response) => {
  try {
    const { modelId, status, limit = '50' } = req.query;

    const where: any = {};
    if (modelId) where.modelId = modelId;
    if (status) where.status = status;

    const trades = await prisma.trade.findMany({
      where,
      include: {
        model: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    // 对于卖出交易，查找对应的买入交易获取成本价
    const enrichedTrades = await Promise.all(
      trades.map(async (trade) => {
        if (trade.side === 'SELL') {
          // 查找该股票最近的买入记录
          const buyTrade = await prisma.trade.findFirst({
            where: {
              modelId: trade.modelId,
              symbol: trade.symbol,
              side: 'BUY',
              executedAt: {
                lt: trade.executedAt || trade.createdAt,
              },
            },
            orderBy: {
              executedAt: 'desc',
            },
          });

          return {
            ...trade,
            avgCost: buyTrade?.price || null,
          };
        }
        return trade;
      })
    );

    res.json(enrichedTrades);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/trades/:tradeId', async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        model: true,
        reflection: true,
      },
    });

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json(trade);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 反思记录 ==========

router.get('/reflections', async (req: Request, res: Response) => {
  try {
    const { modelId, limit = '20' } = req.query;

    const where: any = {};
    if (modelId) where.modelId = modelId;

    const reflections = await prisma.reflection.findMany({
      where,
      include: {
        trade: true,
        model: true,
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: parseInt(limit as string),
    });

    res.json(reflections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== AI 选股 ==========

router.post('/stock-picker', async (req: Request, res: Response) => {
  try {
    const { criteria, maxResults = 10 } = req.body;

    if (!criteria) {
      return res.status(400).json({ error: 'Criteria is required' });
    }

    const recommendations = await stockPickerService.pickStocks(criteria, maxResults);

    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stock-pool', async (req: Request, res: Response) => {
  try {
    const { symbols, name, createdBy = 'USER', reason } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }

    const poolId = await stockPickerService.saveStockPool(symbols, name || 'Custom Stock Pool', createdBy, reason);

    res.json({ id: poolId, message: 'Stock pool saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stock-pool', async (req: Request, res: Response) => {
  try {
    const symbols = await stockPickerService.getActiveStockPool();
    res.json({ symbols });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 市场数据 ==========

router.get('/market-data/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { days = '30' } = req.query;

    const marketData = await marketDataProvider.getMarketData([symbol], parseInt(days as string));

    res.json(marketData[symbol] || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 新闻数据 ==========

router.get('/news', async (req: Request, res: Response) => {
  try {
    const { symbols, hours = '24' } = req.query;

    const symbolsArray = symbols ? (symbols as string).split(',') : undefined;
    const news = await newsDataProvider.getNews(symbolsArray, parseInt(hours as string));

    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 系统状态 ==========

router.get('/status', async (req: Request, res: Response) => {
  try {
    const models = await prisma.model.count({ where: { enabled: true } });
    const trades = await prisma.trade.count();
    const reflections = await prisma.reflection.count();

    res.json({
      status: 'running',
      timestamp: new Date(),
      stats: {
        models,
        trades,
        reflections,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 每日战报 ==========

// 获取战报列表
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;
    const reports = await reportService.getReportsList(parseInt(limit as string));
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取战报详情（通过ID）
router.get('/reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const report = await reportService.getReportDetail(reportId);
    res.json(report);
  } catch (error: any) {
    if (error.message === 'Report not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 获取战报详情（通过Day编号）
router.get('/reports/day/:day', async (req: Request, res: Response) => {
  try {
    const { day } = req.params;
    const report = await reportService.getReportByDay(parseInt(day));
    res.json(report);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 手动生成战报
router.post('/reports/generate', async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    const reportDate = date ? new Date(date) : new Date();
    const reportId = await reportService.generateDailyReport(reportDate);
    res.json({ 
      success: true, 
      reportId,
      message: 'Daily report generated successfully' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

