// 定时任务：交易分析和反思

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { BrainService } from '../services/brain.service';
import { ReflectionService } from '../services/reflection.service';
import { PortfolioService } from '../services/portfolio.service';
import { StockPickerService } from '../services/stockpicker.service';
import { ReportService } from '../services/report.service';
import { DeepSeekAdapter } from '../adapters/llm/deepseek.adapter';
import { QwenAdapter } from '../adapters/llm/qwen.adapter';
import { MockMarketDataProvider, MockNewsDataProvider } from '../adapters/data/mock.adapter';
import { WebSocketServer } from '../websocket/server';

const prisma = new PrismaClient();

export class TradingCron {
  private wsServer: WebSocketServer;
  private portfolioService: PortfolioService;
  private stockPickerService: StockPickerService;
  private reportService: ReportService;
  private marketDataProvider: MockMarketDataProvider;
  private newsDataProvider: MockNewsDataProvider;

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
    this.portfolioService = new PortfolioService();
    this.reportService = new ReportService();
    this.marketDataProvider = new MockMarketDataProvider();
    this.newsDataProvider = new MockNewsDataProvider();

    // 初始化选股服务
    const deepseekAdapter = new DeepSeekAdapter();
    deepseekAdapter.initialize({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      apiUrl: process.env.DEEPSEEK_API_URL || '',
      modelId: 'deepseek-chat',
    });
    this.stockPickerService = new StockPickerService(deepseekAdapter);
  }

  /**
   * 启动所有定时任务
   */
  start(): void {
    // 盘前分析任务：每天美东时间 9:00 AM (UTC-5) 
    // 注意：node-cron 使用服务器本地时间，需要根据实际部署环境调整
    // 这里为了演示，设置为每天早上 9 点
    const premarketCron = process.env.PREMARKET_ANALYSIS_CRON || '0 9 * * 1-5';
    cron.schedule(premarketCron, () => {
      this.runPremarketAnalysis();
    });

    console.log(`[TradingCron] Premarket analysis scheduled: ${premarketCron}`);

    // 盘后反思任务：每天美东时间 4:30 PM
    const postmarketCron = process.env.POSTMARKET_REFLECTION_CRON || '30 16 * * 1-5';
    cron.schedule(postmarketCron, () => {
      this.runPostmarketReflection();
    });

    console.log(`[TradingCron] Postmarket reflection scheduled: ${postmarketCron}`);

    // 每日战报生成任务：每天美东时间 5:00 PM (盘后半小时)
    const reportCron = process.env.DAILY_REPORT_CRON || '0 17 * * 1-5';
    cron.schedule(reportCron, () => {
      this.generateDailyReport();
    });

    console.log(`[TradingCron] Daily report generation scheduled: ${reportCron}`);

    // 开发模式：立即执行一次（用于测试）
    if (process.env.NODE_ENV === 'development') {
      console.log('[TradingCron] Development mode: running analysis immediately...');
      setTimeout(() => {
        this.runPremarketAnalysis();
      }, 5000); // 延迟 5 秒启动
    }
  }

  /**
   * 盘前分析：让所有模型分析市场并执行交易
   */
  private async runPremarketAnalysis(): Promise<void> {
    console.log('[TradingCron] === Premarket Analysis Started ===');

    try {
      // 1. 获取活跃的股票池
      const stockPool = await this.stockPickerService.getActiveStockPool();
      console.log(`[TradingCron] Stock pool: ${stockPool.join(', ')}`);

      // 2. 获取所有启用的模型
      const models = await prisma.model.findMany({
        where: { enabled: true },
      });

      console.log(`[TradingCron] Found ${models.length} active models`);

      // 3. 为每个模型执行分析
      for (const model of models) {
        try {
          await this.analyzeAndTrade(model.id, model.name, stockPool);
        } catch (error: any) {
          console.error(`[TradingCron] Error analyzing for model ${model.name}:`, error.message);
          this.wsServer.sendError(`Failed to analyze for ${model.name}: ${error.message}`);
        }
      }

      console.log('[TradingCron] === Premarket Analysis Completed ===');
    } catch (error: any) {
      console.error('[TradingCron] Premarket analysis failed:', error.message);
      this.wsServer.sendError(`Premarket analysis failed: ${error.message}`);
    }
  }

  /**
   * 为单个模型执行分析和交易
   */
  private async analyzeAndTrade(modelId: string, modelName: string, stockPool: string[]): Promise<void> {
    console.log(`[TradingCron] Analyzing for model: ${modelName}`);

    // 初始化对应的 LLM 适配器
    let llmProvider;
    if (modelName.toLowerCase().includes('deepseek')) {
      llmProvider = new DeepSeekAdapter();
      llmProvider.initialize({
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        apiUrl: process.env.DEEPSEEK_API_URL || '',
        modelId: 'deepseek-chat',
      });
    } else if (modelName.toLowerCase().includes('qwen')) {
      llmProvider = new QwenAdapter();
      llmProvider.initialize({
        apiKey: process.env.QWEN_API_KEY || '',
        apiUrl: process.env.QWEN_API_URL || '',
        modelId: 'qwen-max',
      });
    } else {
      throw new Error(`Unknown model type: ${modelName}`);
    }

    // 创建 BrainService
    const brainService = new BrainService(
      llmProvider,
      this.marketDataProvider,
      this.newsDataProvider,
      this.portfolioService
    );

    // 执行分析
    this.wsServer.sendModelThinking(modelId, `${modelName} is analyzing market data...`);
    const decisions = await brainService.analyze(modelId, stockPool);

    this.wsServer.sendModelThinking(modelId, `${modelName} generated ${decisions.length} trading decisions`);

    // 执行交易
    await brainService.executeTrades(modelId, decisions);

    // 更新持仓价格
    const currentPrices = await this.marketDataProvider.getCurrentPrices(stockPool);
    await this.portfolioService.updatePositionPrices(modelId, currentPrices);

    // 获取更新后的投资组合状态
    const portfolio = await this.portfolioService.getPortfolioStatus(modelId);

    // 推送更新到前端
    this.wsServer.sendPortfolioUpdate(modelId, portfolio);

    console.log(`[TradingCron] ${modelName} analysis completed. Portfolio value: $${portfolio.totalValue.toFixed(2)}`);
  }

  /**
   * 盘后反思：触发反思流程
   */
  private async runPostmarketReflection(): Promise<void> {
    console.log('[TradingCron] === Postmarket Reflection Started ===');

    try {
      const models = await prisma.model.findMany({
        where: { enabled: true },
      });

      for (const model of models) {
        try {
          await this.reflectForModel(model.id, model.name);
        } catch (error: any) {
          console.error(`[TradingCron] Error reflecting for model ${model.name}:`, error.message);
        }
      }

      console.log('[TradingCron] === Postmarket Reflection Completed ===');
    } catch (error: any) {
      console.error('[TradingCron] Postmarket reflection failed:', error.message);
    }
  }

  /**
   * 为单个模型执行反思
   */
  private async reflectForModel(modelId: string, modelName: string): Promise<void> {
    // 初始化对应的 LLM 适配器
    let llmProvider;
    if (modelName.toLowerCase().includes('deepseek')) {
      llmProvider = new DeepSeekAdapter();
      llmProvider.initialize({
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        apiUrl: process.env.DEEPSEEK_API_URL || '',
        modelId: 'deepseek-chat',
      });
    } else if (modelName.toLowerCase().includes('qwen')) {
      llmProvider = new QwenAdapter();
      llmProvider.initialize({
        apiKey: process.env.QWEN_API_KEY || '',
        apiUrl: process.env.QWEN_API_URL || '',
        modelId: 'qwen-max',
      });
    } else {
      return;
    }

    const reflectionService = new ReflectionService(llmProvider, this.marketDataProvider, this.newsDataProvider);

    const reflectionDays = parseInt(process.env.REFLECTION_DAYS || '5');
    await reflectionService.triggerReflections(reflectionDays);

    console.log(`[TradingCron] Reflection completed for ${modelName}`);
  }

  /**
   * 生成每日战报
   */
  private async generateDailyReport(): Promise<void> {
    console.log('[TradingCron] === Generating Daily Report ===');

    try {
      const reportId = await this.reportService.generateDailyReport();
      console.log(`[TradingCron] Daily report generated successfully: ${reportId}`);
    } catch (error: any) {
      console.error('[TradingCron] Failed to generate daily report:', error.message);
    }
  }
}

