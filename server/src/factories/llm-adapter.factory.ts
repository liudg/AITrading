// LLM 适配器工厂：统一管理 LLM 适配器的创建和缓存

import { ILLMProvider, LLMConfig } from "../adapters/llm/interface";
import { DeepSeekAdapter } from "../adapters/llm/deepseek.adapter";
import { QwenAdapter } from "../adapters/llm/qwen.adapter";
import { Logger } from "../lib/logger";

const logger = Logger.create("LLMAdapterFactory");

/**
 * LLM 提供商类型
 */
export enum LLMProviderType {
  DEEPSEEK = "deepseek",
  QWEN = "qwen",
}

/**
 * LLM 适配器配置
 */
export interface LLMAdapterConfig {
  providerType: LLMProviderType;
  apiKey: string;
  apiUrl: string;
  modelId: string;
}

/**
 * LLM 适配器工厂类
 * 单例模式，管理适配器的创建和缓存
 */
export class LLMAdapterFactory {
  private static instance: LLMAdapterFactory;
  private adapterCache: Map<LLMProviderType, ILLMProvider> = new Map();

  private constructor() {}

  /**
   * 获取工厂单例
   */
  static getInstance(): LLMAdapterFactory {
    if (!LLMAdapterFactory.instance) {
      LLMAdapterFactory.instance = new LLMAdapterFactory();
    }
    return LLMAdapterFactory.instance;
  }

  /**
   * 根据模型名称获取提供商类型
   * 支持简写和完整模型名称匹配
   */
  static getProviderTypeByModelName(modelName: string): LLMProviderType | null {
    const normalizedName = modelName.toLowerCase();

    // 支持简写匹配（deepseek, qwen）和完整模型名称匹配
    if (normalizedName.includes("deepseek")) {
      return LLMProviderType.DEEPSEEK;
    } else if (normalizedName.includes("qwen")) {
      return LLMProviderType.QWEN;
    }

    return null;
  }

  /**
   * 获取或创建适配器（带缓存）
   */
  getAdapter(providerType: LLMProviderType): ILLMProvider {
    // 检查缓存
    if (this.adapterCache.has(providerType)) {
      logger.debug(`Using cached adapter for ${providerType}`);
      return this.adapterCache.get(providerType)!;
    }

    // 创建新适配器
    logger.info(`Creating new adapter for ${providerType}`);
    const adapter = this.createAdapter(providerType);

    // 缓存适配器
    this.adapterCache.set(providerType, adapter);

    return adapter;
  }

  /**
   * 根据模型名称获取适配器
   */
  getAdapterByModelName(modelName: string): ILLMProvider {
    const providerType =
      LLMAdapterFactory.getProviderTypeByModelName(modelName);

    if (!providerType) {
      throw new Error(
        `Unknown model type: ${modelName}. Cannot determine provider.`
      );
    }

    return this.getAdapter(providerType);
  }

  /**
   * 创建适配器实例
   */
  private createAdapter(providerType: LLMProviderType): ILLMProvider {
    let adapter: ILLMProvider;
    let config: LLMConfig;

    switch (providerType) {
      case LLMProviderType.DEEPSEEK:
        adapter = new DeepSeekAdapter();
        config = {
          apiKey: process.env.DEEPSEEK_API_KEY || "",
          apiUrl: process.env.DEEPSEEK_API_URL || "",
          modelId: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        };
        break;

      case LLMProviderType.QWEN:
        adapter = new QwenAdapter();
        config = {
          apiKey: process.env.QWEN_API_KEY || "",
          apiUrl: process.env.QWEN_API_URL || "",
          modelId: process.env.QWEN_MODEL || "qwen3-max",
        };
        break;

      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }

    // 初始化适配器
    adapter.initialize(config);
    logger.info(
      `Adapter initialized for ${providerType} with model ${config.modelId}`
    );

    return adapter;
  }

  /**
   * 创建新的适配器实例（不使用缓存）
   * 用于需要独立配置的场景
   */
  createNewAdapter(config: LLMAdapterConfig): ILLMProvider {
    let adapter: ILLMProvider;

    switch (config.providerType) {
      case LLMProviderType.DEEPSEEK:
        adapter = new DeepSeekAdapter();
        break;

      case LLMProviderType.QWEN:
        adapter = new QwenAdapter();
        break;

      default:
        throw new Error(`Unsupported provider type: ${config.providerType}`);
    }

    adapter.initialize({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      modelId: config.modelId,
    });

    logger.info(
      `New adapter created for ${config.providerType} with model ${config.modelId}`
    );

    return adapter;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    logger.info("Clearing adapter cache");
    this.adapterCache.clear();
  }

  /**
   * 清除指定提供商的缓存
   */
  clearCacheFor(providerType: LLMProviderType): void {
    logger.info(`Clearing cache for ${providerType}`);
    this.adapterCache.delete(providerType);
  }
}

/**
 * 导出工厂单例
 */
export const llmAdapterFactory = LLMAdapterFactory.getInstance();
