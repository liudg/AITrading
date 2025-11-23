// WebSocket 服务器

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Logger } from '../lib/logger';
import { WSMessage, WSMessageType } from '../types';

const logger = Logger.create('WebSocket');

export class WebSocketServer {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // 开发环境允许所有来源，生产环境需要限制
        methods: ['GET', 'POST'],
      },
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });

      socket.on('subscribe', (room: string) => {
        socket.join(room);
        logger.debug(`Client ${socket.id} joined room: ${room}`);
      });

      socket.on('unsubscribe', (room: string) => {
        socket.leave(room);
        logger.debug(`Client ${socket.id} left room: ${room}`);
      });
    });
  }

  /**
   * 广播消息到所有连接的客户端
   */
  broadcast(message: WSMessage): void {
    this.io.emit('message', message);
  }

  /**
   * 发送消息到特定房间
   */
  sendToRoom(room: string, message: WSMessage): void {
    this.io.to(room).emit('message', message);
  }

  /**
   * 发送投资组合更新
   */
  sendPortfolioUpdate(modelId: string, portfolio: any): void {
    const message: WSMessage = {
      type: WSMessageType.PORTFOLIO_UPDATE,
      payload: { modelId, portfolio },
      timestamp: new Date(),
    };
    this.sendToRoom(`model:${modelId}`, message);
    this.broadcast(message); // 也广播给所有客户端
  }

  /**
   * 发送交易执行通知
   */
  sendTradeExecuted(modelId: string, trade: any): void {
    const message: WSMessage = {
      type: WSMessageType.TRADE_EXECUTED,
      payload: { modelId, trade },
      timestamp: new Date(),
    };
    this.sendToRoom(`model:${modelId}`, message);
    this.broadcast(message);
  }

  /**
   * 发送模型思考过程（流式）
   */
  sendModelThinking(modelId: string, content: string): void {
    const message: WSMessage = {
      type: WSMessageType.MODEL_THINKING,
      payload: { modelId, content },
      timestamp: new Date(),
    };
    this.sendToRoom(`model:${modelId}`, message);
  }

  /**
   * 发送反思创建通知
   */
  sendReflectionCreated(modelId: string, reflection: any): void {
    const message: WSMessage = {
      type: WSMessageType.REFLECTION_CREATED,
      payload: { modelId, reflection },
      timestamp: new Date(),
    };
    this.sendToRoom(`model:${modelId}`, message);
    this.broadcast(message);
  }

  /**
   * 发送错误消息
   */
  sendError(error: string): void {
    const message: WSMessage = {
      type: WSMessageType.ERROR,
      payload: { error },
      timestamp: new Date(),
    };
    this.broadcast(message);
  }
}

