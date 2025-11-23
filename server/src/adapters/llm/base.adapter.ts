// LLM 适配器基类
// 提供统一的配置验证、错误处理和重试机制

import OpenAI from "openai";
import { Logger } from "../../lib/logger";
import { ILLMProvider, LLMConfig } from "./interface";

const logger = Logger.create("BaseAdapter");

/**
 * API 错误类型
 */
export enum APIErrorType {
  NETWORK_ERROR = "NETWORK_ERROR", // 网络错误
  AUTH_ERROR = "AUTH_ERROR", // 认证错误
  RATE_LIMIT = "RATE_LIMIT", // 限流
  INVALID_REQUEST = "INVALID_REQUEST", // 无效请求
  SERVER_ERROR = "SERVER_ERROR", // 服务器错误
  TIMEOUT = "TIMEOUT", // 超时
  UNKNOWN = "UNKNOWN", // 未知错误
}

/**
 * API 错误类
 */
export class APIError extends Error {
  constructor(
    public type: APIErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number; // 最大重试次数
  initialDelay: number; // 初始延迟（毫秒）
  maxDelay: number; // 最大延迟（毫秒）
  backoffMultiplier: number; // 退避乘数
}

/**
 * API 调用配置
 */
export interface APICallConfig {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * 基础适配器抽象类
 */
export abstract class BaseAdapter implements ILLMProvider {
  protected config: LLMConfig | null = null;
  protected openai: OpenAI | null = null;
  protected retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      initialDelay: retryConfig?.initialDelay ?? 1000,
      maxDelay: retryConfig?.maxDelay ?? 10000,
      backoffMultiplier: retryConfig?.backoffMultiplier ?? 2,
    };
  }

  /**
   * 初始化配置
   */
  initialize(config: LLMConfig): void {
    // 验证配置
    this.validateConfig(config);

    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
      timeout: 60000, // 60秒超时
      maxRetries: 0, // 我们自己处理重试
    });

    logger.info(`${this.getProviderName()} 适配器已初始化`, {
      apiUrl: config.apiUrl,
      modelId: config.modelId,
    });
  }

  /**
   * 验证配置
   */
  private validateConfig(config: LLMConfig): void {
    const errors: string[] = [];

    if (!config.apiKey || config.apiKey.trim() === "") {
      errors.push("apiKey 不能为空");
    }

    if (!config.apiUrl || config.apiUrl.trim() === "") {
      errors.push("apiUrl 不能为空");
    } else {
      try {
        new URL(config.apiUrl);
      } catch {
        errors.push("apiUrl 格式无效");
      }
    }

    if (!config.modelId || config.modelId.trim() === "") {
      errors.push("modelId 不能为空");
    }

    if (errors.length > 0) {
      throw new Error(`配置验证失败：${errors.join("；")}`);
    }
  }

  /**
   * 确保已初始化
   */
  protected ensureInitialized(): void {
    if (!this.config || !this.openai) {
      throw new Error(`${this.getProviderName()} 适配器未初始化`);
    }
  }

  /**
   * 带重试的 API 调用
   */
  protected async callWithRetry<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const apiError = this.classifyError(error);

        logger.warn(
          `API 调用失败 (尝试 ${attempt + 1}/${
            this.retryConfig.maxRetries + 1
          })`,
          {
            context,
            errorType: apiError.type,
            message: apiError.message,
          }
        );

        // 某些错误不应该重试
        if (!this.shouldRetry(apiError)) {
          throw apiError;
        }

        // 如果还有重试机会，等待后重试
        if (attempt < this.retryConfig.maxRetries) {
          await this.sleep(delay);
          delay = Math.min(
            delay * this.retryConfig.backoffMultiplier,
            this.retryConfig.maxDelay
          );
        }
      }
    }

    // 所有重试都失败了
    throw lastError || new Error("未知错误");
  }

  /**
   * 错误分类
   */
  private classifyError(error: any): APIError {
    // OpenAI SDK 错误
    if (error?.status) {
      const status = error.status;
      if (status === 401 || status === 403) {
        return new APIError(APIErrorType.AUTH_ERROR, "API 认证失败", error);
      }
      if (status === 429) {
        return new APIError(APIErrorType.RATE_LIMIT, "API 请求限流", error);
      }
      if (status >= 400 && status < 500) {
        return new APIError(
          APIErrorType.INVALID_REQUEST,
          "无效的 API 请求",
          error
        );
      }
      if (status >= 500) {
        return new APIError(APIErrorType.SERVER_ERROR, "API 服务器错误", error);
      }
    }

    // 网络错误
    if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND") {
      return new APIError(APIErrorType.NETWORK_ERROR, "网络连接失败", error);
    }

    // 超时错误
    if (error?.code === "ETIMEDOUT" || error?.name === "TimeoutError") {
      return new APIError(APIErrorType.TIMEOUT, "API 请求超时", error);
    }

    // 默认为未知错误
    return new APIError(
      APIErrorType.UNKNOWN,
      error?.message || "未知错误",
      error
    );
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: APIError): boolean {
    // 这些错误不应该重试
    const noRetryTypes = [
      APIErrorType.AUTH_ERROR,
      APIErrorType.INVALID_REQUEST,
    ];

    return !noRetryTypes.includes(error.type);
  }

  /**
   * 调用 OpenAI Chat API
   */
  protected async callChatAPI(
    userPrompt: string,
    config: APICallConfig = {}
  ): Promise<string> {
    this.ensureInitialized();

    return this.callWithRetry(async () => {
      const response = await this.openai!.chat.completions.create({
        model: this.config!.modelId,
        messages: [
          {
            role: "system",
            content: config.systemPrompt || "你是一个专业的 AI 助手。",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("API 返回空内容");
      }

      return content;
    }, "ChatAPI");
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取提供商名称（子类实现）
   */
  protected abstract getProviderName(): string;

  /**
   * 必须实现的接口方法
   */
  abstract analyze(context: any): Promise<any>;
  abstract reflect(input: any): Promise<any>;
  abstract pickStocks(input: any): Promise<any>;
  abstract analyzeSingleStock(input: any): Promise<any>;
}
