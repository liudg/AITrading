// 服务容器 - 统一管理所有服务单例

import { Logger } from "./logger";
import { llmAdapterFactory } from "../factories/llm-adapter.factory";
import { PortfolioService } from "../services/portfolio.service";
import { BrainService } from "../services/brain.service";
import { ReflectionService } from "../services/reflection.service";
import { ReportService } from "../services/report.service";
import { StockPickerService } from "../services/stockpicker.service";
import {
  MockMarketDataProvider,
  MockNewsDataProvider,
} from "../adapters/data/mock.adapter";
import {
  IMarketDataProvider,
  INewsDataProvider,
} from "../adapters/data/interface";
import { ILLMProvider } from "../adapters/llm/interface";

const logger = Logger.create("ServiceContainer");

/**
 * 服务容器类 - 单例模式管理所有服务实例
 */
class ServiceContainer {
  private static instance: ServiceContainer;

  // 基础服务（单例）
  private _portfolioService?: PortfolioService;
  private _reportService?: ReportService;
  private _marketDataProvider?: IMarketDataProvider;
  private _newsDataProvider?: INewsDataProvider;
  private _stockPickerService?: StockPickerService;

  // LLM Adapters 缓存
  private llmAdapters = new Map<string, ILLMProvider>();

  // BrainService 缓存（按模型名称）
  private brainServices = new Map<string, BrainService>();

  // ReflectionService 缓存（按模型名称）
  private reflectionServices = new Map<string, ReflectionService>();

  private constructor() {
    logger.info("Service container initialized");
  }

  /**
   * 获取服务容器单例
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  // ========== 基础服务 ==========

  /**
   * 获取 PortfolioService（单例）
   */
  getPortfolioService(): PortfolioService {
    if (!this._portfolioService) {
      this._portfolioService = new PortfolioService();
      logger.debug("PortfolioService created");
    }
    return this._portfolioService;
  }

  /**
   * 获取 ReportService（单例）
   */
  getReportService(): ReportService {
    if (!this._reportService) {
      this._reportService = new ReportService();
      logger.debug("ReportService created");
    }
    return this._reportService;
  }

  /**
   * 获取 MarketDataProvider（单例）
   */
  getMarketDataProvider(): IMarketDataProvider {
    if (!this._marketDataProvider) {
      // TODO: 可以根据环境变量切换真实API或Mock
      this._marketDataProvider = new MockMarketDataProvider();
      logger.debug("MarketDataProvider created (Mock)");
    }
    return this._marketDataProvider;
  }

  /**
   * 获取 NewsDataProvider（单例）
   */
  getNewsDataProvider(): INewsDataProvider {
    if (!this._newsDataProvider) {
      // TODO: 可以根据环境变量切换真实API或Mock
      this._newsDataProvider = new MockNewsDataProvider();
      logger.debug("NewsDataProvider created (Mock)");
    }
    return this._newsDataProvider;
  }

  /**
   * 获取 StockPickerService（单例）
   */
  getStockPickerService(): StockPickerService {
    if (!this._stockPickerService) {
      const deepseekAdapter = this.getLLMAdapter("deepseek");
      this._stockPickerService = new StockPickerService(deepseekAdapter);
      logger.debug("StockPickerService created");
    }
    return this._stockPickerService;
  }

  // ========== LLM相关服务 ==========

  /**
   * 获取 LLM Adapter（缓存）
   */
  getLLMAdapter(modelName: string): ILLMProvider {
    if (!this.llmAdapters.has(modelName)) {
      const adapter = llmAdapterFactory.getAdapterByModelName(modelName);
      this.llmAdapters.set(modelName, adapter);
      logger.debug(`LLM Adapter created for ${modelName}`);
    }
    return this.llmAdapters.get(modelName)!;
  }

  /**
   * 获取 BrainService（按模型名称缓存）
   * 注意：BrainService 包含模型特定的逻辑，所以按模型缓存
   */
  getBrainService(modelName: string): BrainService {
    if (!this.brainServices.has(modelName)) {
      const llmProvider = this.getLLMAdapter(modelName);
      const brainService = new BrainService(
        llmProvider,
        this.getMarketDataProvider(),
        this.getNewsDataProvider(),
        this.getPortfolioService()
      );
      this.brainServices.set(modelName, brainService);
      logger.debug(`BrainService created for ${modelName}`);
    }
    return this.brainServices.get(modelName)!;
  }

  /**
   * 获取 ReflectionService（按模型名称缓存）
   */
  getReflectionService(modelName: string): ReflectionService {
    if (!this.reflectionServices.has(modelName)) {
      const llmProvider = this.getLLMAdapter(modelName);
      const reflectionService = new ReflectionService(
        llmProvider,
        this.getMarketDataProvider(),
        this.getNewsDataProvider()
      );
      this.reflectionServices.set(modelName, reflectionService);
      logger.debug(`ReflectionService created for ${modelName}`);
    }
    return this.reflectionServices.get(modelName)!;
  }

  // ========== 工具方法 ==========

  /**
   * 清除所有缓存（用于测试或重新加载）
   */
  clearCache(): void {
    this.llmAdapters.clear();
    this.brainServices.clear();
    this.reflectionServices.clear();
    logger.info("Service container cache cleared");
  }

  /**
   * 获取服务统计信息
   */
  getStats() {
    return {
      llmAdapters: this.llmAdapters.size,
      brainServices: this.brainServices.size,
      reflectionServices: this.reflectionServices.size,
      portfolioService: !!this._portfolioService,
      reportService: !!this._reportService,
      marketDataProvider: !!this._marketDataProvider,
      newsDataProvider: !!this._newsDataProvider,
      stockPickerService: !!this._stockPickerService,
    };
  }
}

// 导出单例实例
export const serviceContainer = ServiceContainer.getInstance();
