// 日志服务：统一的日志管理
import winston from 'winston';
import path from 'path';

// 日志级别
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack, context }) => {
    const contextStr = context ? `[${context}]` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `[${timestamp}] ${level.toUpperCase()} ${contextStr} ${message}${stackStr}`;
  })
);

// 创建 Winston logger 实例
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Logger 类：提供统一的日志接口
 */
export class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  /**
   * 创建带上下文的 Logger 实例
   */
  static create(context: string): Logger {
    return new Logger(context);
  }

  /**
   * 记录调试信息
   */
  debug(message: string, ...meta: any[]): void {
    winstonLogger.debug(message, { context: this.context, ...meta });
  }

  /**
   * 记录一般信息
   */
  info(message: string, ...meta: any[]): void {
    winstonLogger.info(message, { context: this.context, ...meta });
  }

  /**
   * 记录警告信息
   */
  warn(message: string, ...meta: any[]): void {
    winstonLogger.warn(message, { context: this.context, ...meta });
  }

  /**
   * 记录错误信息
   */
  error(message: string, error?: Error | any, ...meta: any[]): void {
    if (error instanceof Error) {
      winstonLogger.error(message, { 
        context: this.context, 
        stack: error.stack,
        ...meta 
      });
    } else {
      winstonLogger.error(message, { 
        context: this.context, 
        error,
        ...meta 
      });
    }
  }
}

// 导出默认 logger 实例
export const logger = new Logger();

