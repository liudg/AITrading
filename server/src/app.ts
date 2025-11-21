// 应用程序入口

import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import routes from './routes';
import { WebSocketServer } from './websocket/server';
import { TradingCron } from './cron/trading.cron';

// 加载环境变量
dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 错误处理
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`   - API: http://localhost:${PORT}/api`);
  console.log(`   - Health: http://localhost:${PORT}/health`);

  // 初始化 WebSocket
  const wsServer = new WebSocketServer(httpServer);
  console.log(`✅ WebSocket server initialized`);

  // 初始化数据库并创建默认模型
  await initializeDatabase();

  // 启动定时任务
  const tradingCron = new TradingCron(wsServer);
  tradingCron.start();
  console.log(`✅ Trading cron jobs started`);
});

/**
 * 初始化数据库
 */
async function initializeDatabase(): Promise<void> {
  try {
    // 检查是否已存在模型
    const existingModels = await prisma.model.count();

    if (existingModels === 0) {
      console.log('[Database] Creating default models...');

      // 创建 DeepSeek 模型
      const deepseekModel = await prisma.model.create({
        data: {
          name: 'deepseek-v3',
          displayName: 'DeepSeek-V3',
          apiConfig: JSON.stringify({
            apiKey: process.env.DEEPSEEK_API_KEY || '',
            apiUrl: process.env.DEEPSEEK_API_URL || '',
            modelId: 'deepseek-chat',
          }),
          enabled: true,
        },
      });

      await prisma.portfolio.create({
        data: {
          modelId: deepseekModel.id,
          cash: 100000,
          totalValue: 100000,
          initialValue: 100000,
        },
      });

      // 创建 Qwen 模型
      const qwenModel = await prisma.model.create({
        data: {
          name: 'qwen-max',
          displayName: 'Qwen-Max',
          apiConfig: JSON.stringify({
            apiKey: process.env.QWEN_API_KEY || '',
            apiUrl: process.env.QWEN_API_URL || '',
            modelId: 'qwen-max',
          }),
          enabled: true,
        },
      });

      await prisma.portfolio.create({
        data: {
          modelId: qwenModel.id,
          cash: 100000,
          totalValue: 100000,
          initialValue: 100000,
        },
      });

      console.log('[Database] ✅ Default models created');
    } else {
      console.log(`[Database] ✅ Found ${existingModels} existing models`);
    }

    // 创建默认股票池（如果不存在）
    const existingStockPool = await prisma.stockPool.findFirst({
      where: { active: true },
    });

    if (!existingStockPool) {
      await prisma.stockPool.create({
        data: {
          name: 'Default Tech Stocks',
          symbols: JSON.stringify(['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN', 'AMD', 'NFLX', 'BABA']),
          createdBy: 'USER',
          active: true,
        },
      });
      console.log('[Database] ✅ Default stock pool created');
    }
  } catch (error: any) {
    console.error('[Database] Initialization error:', error.message);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

