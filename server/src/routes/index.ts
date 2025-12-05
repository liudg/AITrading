// API 路由

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Logger } from '../lib/logger';
import { serviceContainer } from '../lib/service-container';

const router = Router();
const logger = Logger.create('Routes');

// 从服务容器获取服务实例（单例）
const portfolioService = serviceContainer.getPortfolioService();
const marketDataProvider = serviceContainer.getMarketDataProvider();
const newsDataProvider = serviceContainer.getNewsDataProvider();
const reportService = serviceContainer.getReportService();
const stockPickerService = serviceContainer.getStockPickerService();

// ========== 模型管理 ==========

router.get('/models', async (req: Request, res: Response) => {
  try {
    const models = await prisma.model.findMany({
      where: { enabled: true },
      include: { portfolio: true },
    });
    res.json(models);
  } catch (error: any) {
    logger.error('Failed to fetch models', error);
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

    logger.info(`Model created: ${name}`);
    res.json(model);
  } catch (error: any) {
    logger.error('Failed to create model', error);
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
    logger.error(`Failed to fetch portfolio for model ${req.params.modelId}`, error);
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
    logger.error(`Failed to fetch portfolio history for model ${req.params.modelId}`, error);
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
    logger.error('Failed to fetch trades', error);
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
    logger.error(`Failed to fetch trade ${req.params.tradeId}`, error);
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
    logger.error('Failed to fetch reflections', error);
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

    logger.info(`Stock picker generated ${recommendations.length} recommendations`);
    res.json(recommendations);
  } catch (error: any) {
    logger.error('Failed to pick stocks', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/stock-analysis', async (req: Request, res: Response) => {
  try {
    const { symbol, criteria } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const analysis = await stockPickerService.analyzeSingleStock(symbol, criteria);

    logger.info(`Stock analysis completed for ${symbol}`);
    res.json(analysis);
  } catch (error: any) {
    logger.error('Failed to analyze stock', error);
    res.status(500).json({ error: error.message });
  }
});

// 预览批量选股提示词
router.post('/preview-prompt/stock-picker', async (req: Request, res: Response) => {
  try {
    const { criteria, maxResults = 10 } = req.body;

    if (!criteria) {
      return res.status(400).json({ error: 'Criteria is required' });
    }

    const prompts = stockPickerService.previewStockPickerPrompt(criteria, maxResults);

    logger.info('Stock picker prompt preview generated');
    res.json(prompts);
  } catch (error: any) {
    logger.error('Failed to preview stock picker prompt', error);
    res.status(500).json({ error: error.message });
  }
});

// 预览单一股票分析提示词
router.post('/preview-prompt/stock-analysis', async (req: Request, res: Response) => {
  try {
    const { symbol, criteria } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const prompts = stockPickerService.previewSingleStockPrompt(symbol, criteria);

    logger.info(`Stock analysis prompt preview generated for ${symbol}`);
    res.json(prompts);
  } catch (error: any) {
    logger.error('Failed to preview stock analysis prompt', error);
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

    logger.info(`Stock pool saved: ${poolId}`);
    res.json({ id: poolId, message: 'Stock pool saved successfully' });
  } catch (error: any) {
    logger.error('Failed to save stock pool', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/stock-pool', async (req: Request, res: Response) => {
  try {
    const symbols = await stockPickerService.getActiveStockPool();
    res.json({ symbols });
  } catch (error: any) {
    logger.error('Failed to fetch stock pool', error);
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
    logger.error(`Failed to fetch market data for ${req.params.symbol}`, error);
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
    logger.error('Failed to fetch news', error);
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
    logger.error('Failed to fetch system status', error);
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
    logger.error('Failed to fetch reports list', error);
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
      logger.warn(`Report not found: ${req.params.reportId}`);
      res.status(404).json({ error: error.message });
    } else {
      logger.error(`Failed to fetch report ${req.params.reportId}`, error);
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
      logger.warn(`Report not found for day ${req.params.day}`);
      res.status(404).json({ error: error.message });
    } else {
      logger.error(`Failed to fetch report for day ${req.params.day}`, error);
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
    
    logger.info(`Daily report generated: ${reportId}`);
    res.json({ 
      success: true, 
      reportId,
      message: 'Daily report generated successfully' 
    });
  } catch (error: any) {
    logger.error('Failed to generate daily report', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

