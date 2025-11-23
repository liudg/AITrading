// 定时任务：交易分析和反思

import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { Logger } from '../lib/logger';
import { serviceContainer } from '../lib/service-container';
import { WebSocketServer } from '../websocket/server';

const logger = Logger.create('TradingCron');

/**
 * 定时任务锁状态
 */
interface TaskLock {
  premarketAnalysis: boolean;
  postmarketReflection: boolean;
  dailyReport: boolean;
}

export class TradingCron {
  private wsServer: WebSocketServer;
  
  // 任务执行锁（防止重复执行）
  private taskLocks: TaskLock = {
    premarketAnalysis: false,
    postmarketReflection: false,
    dailyReport: false,
  };

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
    logger.info('TradingCron initialized with service container');
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

    logger.info(`Premarket analysis scheduled: ${premarketCron}`);

    // 盘后反思任务：每天美东时间 4:30 PM
    const postmarketCron = process.env.POSTMARKET_REFLECTION_CRON || '30 16 * * 1-5';
    cron.schedule(postmarketCron, () => {
      this.runPostmarketReflection();
    });

    logger.info(`Postmarket reflection scheduled: ${postmarketCron}`);

    // 每日战报生成任务：每天美东时间 5:00 PM (盘后半小时)
    const reportCron = process.env.DAILY_REPORT_CRON || '0 17 * * 1-5';
    cron.schedule(reportCron, () => {
      this.generateDailyReport();
    });

    logger.info(`Daily report generation scheduled: ${reportCron}`);

    // 开发模式：立即执行一次（用于测试）
    if (process.env.NODE_ENV === 'development') {
      logger.info('Development mode: running analysis immediately...');
      setTimeout(() => {
        this.runPremarketAnalysis();
      }, 5000); // 延迟 5 秒启动
    }
  }

  /**
   * 盘前分析：让所有模型分析市场并执行交易
   */
  private async runPremarketAnalysis(): Promise<void> {
    // 检查任务锁
    if (this.taskLocks.premarketAnalysis) {
      logger.warn('Premarket analysis is already running, skipping...');
      return;
    }

    // 加锁
    this.taskLocks.premarketAnalysis = true;

    try {
      logger.info('=== Premarket Analysis Started ===');

      // 1. 获取活跃的股票池
      const stockPool = await this.getStockPool();
      
      // 2. 获取所有启用的模型
      const models = await this.getActiveModels();

      logger.info(`Found ${models.length} active models`);

      // 3. 并发分析所有模型（使用 Promise.allSettled 避免单个失败影响其他）
      await this.analyzeAllModels(models, stockPool);

      logger.info('=== Premarket Analysis Completed ===');
    } catch (error: any) {
      logger.error('Premarket analysis failed', error);
      this.wsServer.sendError(`Premarket analysis failed: ${error.message}`);
    } finally {
      // 释放锁
      this.taskLocks.premarketAnalysis = false;
    }
  }

  /**
   * 获取股票池
   */
  private async getStockPool(): Promise<string[]> {
    const stockPickerService = serviceContainer.getStockPickerService();
    const stockPool = await stockPickerService.getActiveStockPool();
    logger.info(`Stock pool: ${stockPool.join(', ')}`);
    return stockPool;
  }

  /**
   * 获取所有启用的模型
   */
  private async getActiveModels() {
    const models = await prisma.model.findMany({
      where: { enabled: true },
    });
    return models;
  }

  /**
   * 并发分析所有模型
   */
  private async analyzeAllModels(models: any[], stockPool: string[]): Promise<void> {
    const results = await Promise.allSettled(
      models.map(model => this.analyzeAndTrade(model.id, model.name, stockPool))
    );

    // 检查结果并记录失败的模型
    results.forEach((result, index) => {
      const model = models[index];
      if (result.status === 'rejected') {
        logger.error(`Failed to analyze model ${model.name}`, result.reason);
        this.wsServer.sendError(`Failed to analyze ${model.name}: ${result.reason.message}`);
      }
    });
  }

  /**
   * 为单个模型执行分析和交易
   */
  private async analyzeAndTrade(modelId: string, modelName: string, stockPool: string[]): Promise<void> {
    logger.info(`Analyzing for model: ${modelName}`);

    try {
      // 1. 获取 LLM 适配器
      const llmProvider = this.getLLMProvider(modelName);

      // 2. 创建 BrainService 并执行分析
      const decisions = await this.performAnalysis(modelId, modelName, llmProvider, stockPool);

      // 3. 执行交易
      await this.executeTrades(modelId, modelName, llmProvider, decisions);

      // 4. 更新持仓价格
      await this.updatePositionPrices(modelId, stockPool);

      // 5. 推送更新到前端
      await this.sendPortfolioUpdate(modelId);

      logger.info(`${modelName} analysis completed successfully`);
    } catch (error: any) {
      logger.error(`Error analyzing model ${modelName}`, error);
      throw error; // 重新抛出错误供上层处理
    }
  }

  /**
   * 获取 LLM 提供商适配器
   */
  private getLLMProvider(modelName: string) {
    return serviceContainer.getLLMAdapter(modelName);
  }

  /**
   * 执行市场分析
   */
  private async performAnalysis(
    modelId: string,
    modelName: string,
    llmProvider: any,
    stockPool: string[]
  ) {
    const brainService = serviceContainer.getBrainService(modelName);

    this.wsServer.sendModelThinking(modelId, `${modelName} is analyzing market data...`);
    const decisions = await brainService.analyze(modelId, stockPool);
    
    this.wsServer.sendModelThinking(modelId, `${modelName} generated ${decisions.length} trading decisions`);
    logger.debug(`${modelName} generated ${decisions.length} decisions`);

    return decisions;
  }

  /**
   * 执行交易决策
   */
  private async executeTrades(
    modelId: string,
    modelName: string,
    llmProvider: any,
    decisions: any[]
  ): Promise<void> {
    const brainService = serviceContainer.getBrainService(modelName);

    await brainService.executeTrades(modelId, decisions);
    logger.debug(`${modelName} executed ${decisions.length} trades`);
  }

  /**
   * 更新持仓价格
   */
  private async updatePositionPrices(modelId: string, stockPool: string[]): Promise<void> {
    const marketDataProvider = serviceContainer.getMarketDataProvider();
    const portfolioService = serviceContainer.getPortfolioService();
    const currentPrices = await marketDataProvider.getCurrentPrices(stockPool);
    await portfolioService.updatePositionPrices(modelId, currentPrices);
  }

  /**
   * 发送投资组合更新到前端
   */
  private async sendPortfolioUpdate(modelId: string): Promise<void> {
    const portfolioService = serviceContainer.getPortfolioService();
    const portfolio = await portfolioService.getPortfolioStatus(modelId);
    this.wsServer.sendPortfolioUpdate(modelId, portfolio);
    logger.info(`Portfolio value: $${portfolio.totalValue.toFixed(2)}`);
  }

  /**
   * 盘后反思：触发反思流程
   */
  private async runPostmarketReflection(): Promise<void> {
    // 检查任务锁
    if (this.taskLocks.postmarketReflection) {
      logger.warn('Postmarket reflection is already running, skipping...');
      return;
    }

    // 加锁
    this.taskLocks.postmarketReflection = true;

    try {
      logger.info('=== Postmarket Reflection Started ===');

      const models = await this.getActiveModels();

      // 并发执行反思
      const results = await Promise.allSettled(
        models.map(model => this.reflectForModel(model.id, model.name))
      );

      // 检查结果
      results.forEach((result, index) => {
        const model = models[index];
        if (result.status === 'rejected') {
          logger.error(`Failed to reflect for model ${model.name}`, result.reason);
        }
      });

      logger.info('=== Postmarket Reflection Completed ===');
    } catch (error: any) {
      logger.error('Postmarket reflection failed', error);
    } finally {
      // 释放锁
      this.taskLocks.postmarketReflection = false;
    }
  }

  /**
   * 为单个模型执行反思
   */
  private async reflectForModel(modelId: string, modelName: string): Promise<void> {
    try {
      logger.info(`Reflecting for model: ${modelName}`);

      // 获取反思服务
      const reflectionService = serviceContainer.getReflectionService(modelName);

      // 执行反思
      const reflectionDays = parseInt(process.env.REFLECTION_DAYS || '5');
      await reflectionService.triggerReflections(reflectionDays);

      logger.info(`Reflection completed for ${modelName}`);
    } catch (error: any) {
      logger.error(`Error reflecting for model ${modelName}`, error);
      throw error;
    }
  }

  /**
   * 生成每日战报
   */
  private async generateDailyReport(): Promise<void> {
    // 检查任务锁
    if (this.taskLocks.dailyReport) {
      logger.warn('Daily report generation is already running, skipping...');
      return;
    }

    // 加锁
    this.taskLocks.dailyReport = true;

    try {
      logger.info('=== Generating Daily Report ===');

      const reportService = serviceContainer.getReportService();
      const reportId = await reportService.generateDailyReport();
      
      logger.info(`Daily report generated successfully: ${reportId}`);
    } catch (error: any) {
      logger.error('Failed to generate daily report', error);
    } finally {
      // 释放锁
      this.taskLocks.dailyReport = false;
    }
  }
}
