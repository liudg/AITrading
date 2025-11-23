// 配置验证服务

import { Logger } from "./logger";

const logger = Logger.create("ConfigValidator");

/**
 * 配置项定义
 */
interface ConfigItem {
  key: string;
  required: boolean;
  description: string;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  validationMessage?: string;
}

/**
 * 验证结果
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: Record<string, string>;
}

/**
 * 配置项定义列表
 */
const CONFIG_ITEMS: ConfigItem[] = [
  // 基础配置
  {
    key: "PORT",
    required: false,
    description: "服务器端口",
    defaultValue: "3000",
    validator: (val) =>
      !isNaN(Number(val)) && Number(val) > 0 && Number(val) < 65536,
    validationMessage: "PORT必须是1-65535之间的数字",
  },
  {
    key: "NODE_ENV",
    required: false,
    description: "运行环境",
    defaultValue: "development",
  },
  {
    key: "DATABASE_URL",
    required: true,
    description: "数据库连接URL",
  },
  {
    key: "LOG_LEVEL",
    required: false,
    description: "日志级别",
    defaultValue: "info",
    validator: (val) => ["error", "warn", "info", "debug"].includes(val),
    validationMessage: "LOG_LEVEL必须是: error, warn, info, debug之一",
  },

  // LLM API配置 - DeepSeek
  {
    key: "DEEPSEEK_API_KEY",
    required: true,
    description: "DeepSeek API密钥",
  },
  {
    key: "DEEPSEEK_API_URL",
    required: false,
    description: "DeepSeek API地址",
    defaultValue: "https://api.deepseek.com/v1",
  },
  {
    key: "DEEPSEEK_MODEL",
    required: false,
    description: "DeepSeek模型ID",
    defaultValue: "deepseek-chat",
  },

  // LLM API配置 - Qwen
  {
    key: "QWEN_API_KEY",
    required: true,
    description: "Qwen API密钥",
  },
  {
    key: "QWEN_API_URL",
    required: false,
    description: "Qwen API地址",
    defaultValue: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    key: "QWEN_MODEL",
    required: false,
    description: "Qwen模型ID",
    defaultValue: "qwen-max",
  },

  // LLM 参数配置
  {
    key: "LLM_TEMPERATURE_ANALYSIS",
    required: false,
    description: "市场分析Temperature",
    defaultValue: "0.7",
    validator: (val) =>
      !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 2,
    validationMessage: "Temperature必须在0-2之间",
  },
  {
    key: "LLM_MAX_TOKENS_ANALYSIS",
    required: false,
    description: "市场分析最大Token数",
    defaultValue: "4000",
    validator: (val) => !isNaN(Number(val)) && Number(val) > 0,
    validationMessage: "MaxTokens必须是正整数",
  },
  {
    key: "LLM_TEMPERATURE_REFLECTION",
    required: false,
    description: "反思Temperature",
    defaultValue: "0.8",
    validator: (val) =>
      !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 2,
    validationMessage: "Temperature必须在0-2之间",
  },
  {
    key: "LLM_MAX_TOKENS_REFLECTION",
    required: false,
    description: "反思最大Token数",
    defaultValue: "1000",
    validator: (val) => !isNaN(Number(val)) && Number(val) > 0,
    validationMessage: "MaxTokens必须是正整数",
  },

  // 交易策略配置
  {
    key: "INITIAL_CAPITAL",
    required: false,
    description: "初始资金",
    defaultValue: "100000",
    validator: (val) => !isNaN(Number(val)) && Number(val) > 0,
    validationMessage: "INITIAL_CAPITAL必须是正数",
  },
  {
    key: "MAX_POSITION_SIZE",
    required: false,
    description: "单只股票最大持仓比例",
    defaultValue: "0.2",
    validator: (val) =>
      !isNaN(Number(val)) && Number(val) > 0 && Number(val) <= 1,
    validationMessage: "MAX_POSITION_SIZE必须在0-1之间",
  },
  {
    key: "MAX_TOTAL_POSITION",
    required: false,
    description: "总持仓最大比例",
    defaultValue: "0.8",
    validator: (val) =>
      !isNaN(Number(val)) && Number(val) > 0 && Number(val) <= 1,
    validationMessage: "MAX_TOTAL_POSITION必须在0-1之间",
  },

  // 定时任务配置
  {
    key: "PREMARKET_ANALYSIS_CRON",
    required: false,
    description: "盘前分析定时任务",
    defaultValue: "0 9 * * 1-5",
  },
  {
    key: "POSTMARKET_REFLECTION_CRON",
    required: false,
    description: "盘后反思定时任务",
    defaultValue: "30 16 * * 1-5",
  },
  {
    key: "DAILY_REPORT_CRON",
    required: false,
    description: "每日战报定时任务",
    defaultValue: "0 17 * * 1-5",
  },
  {
    key: "REFLECTION_DAYS",
    required: false,
    description: "反思回顾天数",
    defaultValue: "5",
    validator: (val) => !isNaN(Number(val)) && Number(val) > 0,
    validationMessage: "REFLECTION_DAYS必须是正整数",
  },
];

/**
 * 配置验证器类
 */
export class ConfigValidator {
  /**
   * 验证所有配置
   */
  static validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config: Record<string, string> = {};

    logger.info("开始验证配置...");

    for (const item of CONFIG_ITEMS) {
      const value = process.env[item.key];

      // 检查必需配置
      if (item.required && !value) {
        errors.push(`❌ 缺少必需配置: ${item.key} (${item.description})`);
        continue;
      }

      // 使用默认值
      const finalValue = value || item.defaultValue || "";
      config[item.key] = finalValue;

      // 如果使用了默认值，记录警告
      if (!value && item.defaultValue) {
        warnings.push(`⚠️  使用默认值: ${item.key} = ${item.defaultValue}`);
      }

      // 验证值格式
      if (finalValue && item.validator) {
        if (!item.validator(finalValue)) {
          errors.push(
            `❌ 配置格式错误: ${item.key} = "${finalValue}" - ${item.validationMessage}`
          );
        }
      }
    }

    const valid = errors.length === 0;

    // 输出验证结果
    if (valid) {
      logger.info(`✅ 配置验证通过 (${warnings.length}个警告)`);
      if (warnings.length > 0) {
        warnings.forEach((w) => logger.warn(w));
      }
    } else {
      logger.error(`❌ 配置验证失败 (${errors.length}个错误)`);
      errors.forEach((e) => logger.error(e));
    }

    return { valid, errors, warnings, config };
  }

  /**
   * 获取配置项的值（带默认值）
   */
  static get(key: string): string {
    const item = CONFIG_ITEMS.find((i) => i.key === key);
    return process.env[key] || item?.defaultValue || "";
  }

  /**
   * 获取配置项的数字值
   */
  static getNumber(key: string, defaultValue: number = 0): number {
    const value = this.get(key);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * 获取配置项的布尔值
   */
  static getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get(key).toLowerCase();
    if (value === "true" || value === "1" || value === "yes") return true;
    if (value === "false" || value === "0" || value === "no") return false;
    return defaultValue;
  }

  /**
   * 打印配置摘要
   */
  static printSummary(): void {
    logger.info("=".repeat(60));
    logger.info("🚀 AI Trading System - 配置摘要");
    logger.info("=".repeat(60));

    const categories = [
      {
        name: "基础配置",
        keys: ["PORT", "NODE_ENV", "DATABASE_URL", "LOG_LEVEL"],
      },
      {
        name: "DeepSeek配置",
        keys: ["DEEPSEEK_API_KEY", "DEEPSEEK_API_URL", "DEEPSEEK_MODEL"],
      },
      {
        name: "Qwen配置",
        keys: ["QWEN_API_KEY", "QWEN_API_URL", "QWEN_MODEL"],
      },
      {
        name: "交易策略",
        keys: ["INITIAL_CAPITAL", "MAX_POSITION_SIZE", "MAX_TOTAL_POSITION"],
      },
      {
        name: "定时任务",
        keys: [
          "PREMARKET_ANALYSIS_CRON",
          "POSTMARKET_REFLECTION_CRON",
          "DAILY_REPORT_CRON",
        ],
      },
    ];

    for (const category of categories) {
      logger.info(`\n📋 ${category.name}:`);
      for (const key of category.keys) {
        const item = CONFIG_ITEMS.find((i) => i.key === key);
        const value = this.get(key);

        // 对敏感信息进行脱敏
        let displayValue = value;
        if (key.includes("API_KEY") && value) {
          displayValue = `${value.substring(0, 8)}...${value.substring(
            value.length - 4
          )}`;
        }

        logger.info(`  ${key}: ${displayValue || "(未设置)"}`);
      }
    }

    logger.info("\n" + "=".repeat(60));
  }

  /**
   * 检查API密钥是否有效
   */
  static async validateApiKeys(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // 检查DeepSeek
    const deepseekKey = this.get("DEEPSEEK_API_KEY");
    if (deepseekKey && deepseekKey.length < 20) {
      errors.push("DeepSeek API密钥格式可能不正确（长度过短）");
    }

    // 检查Qwen
    const qwenKey = this.get("QWEN_API_KEY");
    if (qwenKey && qwenKey.length < 20) {
      errors.push("Qwen API密钥格式可能不正确（长度过短）");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
