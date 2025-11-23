// Prisma Client 单例
// 避免在开发环境中创建过多的数据库连接

import { PrismaClient, Prisma } from '@prisma/client';

// 全局类型声明，用于在开发环境中保持单例
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 创建或复用 Prisma Client 实例
export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// 在开发环境中，将实例保存到 global 对象，避免热重载时创建多个实例
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// 导出类型，方便其他地方使用
export type PrismaClientType = typeof prisma;

// 导出事务客户端类型
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

