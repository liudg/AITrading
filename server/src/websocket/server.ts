// WebSocket 服务器

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Logger } from '../lib/logger';
import { WSMessage, WSMessageType } from '../types';

const logger = Logger.create('WebSocket');

interface ClientInfo {
  id: string;
  connectedAt: Date;
  lastPing: Date;
  rooms: Set<string>;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private clients: Map<string, ClientInfo> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒
  private readonly CLIENT_TIMEOUT = 60000; // 60秒超时

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // 开发环境允许所有来源，生产环境需要限制
        methods: ['GET', 'POST'],
      },
      // 添加心跳配置
      pingInterval: 25000, // 25秒发送ping
      pingTimeout: 20000, // 20秒没响应就断开
      transports: ['websocket', 'polling'], // 支持多种传输方式
    });

    this.setupHandlers();
    this.startHeartbeat();
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      const clientInfo: ClientInfo = {
        id: socket.id,
        connectedAt: new Date(),
        lastPing: new Date(),
        rooms: new Set(),
      };
      this.clients.set(socket.id, clientInfo);
      
      logger.info(`✅ Client connected: ${socket.id} (Total: ${this.clients.size})`);

      // 发送欢迎消息
      socket.emit('welcome', {
        message: 'Connected to AI Trading System',
        clientId: socket.id,
        serverTime: new Date(),
      });

      // 处理心跳
      socket.on('ping', () => {
        const client = this.clients.get(socket.id);
        if (client) {
          client.lastPing = new Date();
        }
        socket.emit('pong', { timestamp: new Date() });
      });

      // 处理断开连接
      socket.on('disconnect', (reason) => {
        logger.info(`❌ Client disconnected: ${socket.id} (Reason: ${reason})`);
        this.clients.delete(socket.id);
      });

      // 处理连接错误
      socket.on('error', (error) => {
        logger.error(`WebSocket error for ${socket.id}:`, error);
      });

      // 处理订阅房间
      socket.on('subscribe', (room: string) => {
        socket.join(room);
        const client = this.clients.get(socket.id);
        if (client) {
          client.rooms.add(room);
        }
        logger.debug(`Client ${socket.id} joined room: ${room}`);
        socket.emit('subscribed', { room });
      });

      // 处理取消订阅
      socket.on('unsubscribe', (room: string) => {
        socket.leave(room);
        const client = this.clients.get(socket.id);
        if (client) {
          client.rooms.delete(room);
        }
        logger.debug(`Client ${socket.id} left room: ${room}`);
        socket.emit('unsubscribed', { room });
      });
    });
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      let disconnectedCount = 0;

      this.clients.forEach((client, socketId) => {
        const timeSinceLastPing = now - client.lastPing.getTime();
        
        if (timeSinceLastPing > this.CLIENT_TIMEOUT) {
          logger.warn(`Client ${socketId} timed out (${Math.round(timeSinceLastPing / 1000)}s since last ping)`);
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
          this.clients.delete(socketId);
          disconnectedCount++;
        }
      });

      if (disconnectedCount > 0) {
        logger.info(`Cleaned up ${disconnectedCount} inactive connections`);
      }

      // 定期输出连接状态
      if (this.clients.size > 0) {
        logger.debug(`Active connections: ${this.clients.size}`);
      }
    }, this.HEARTBEAT_INTERVAL);

    logger.info('💓 Heartbeat monitor started');
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('Heartbeat monitor stopped');
    }
  }

  /**
   * 获取连接统计信息
   */
  getStats(): { total: number; clients: Array<{ id: string; connectedAt: Date; rooms: string[] }> } {
    const clients = Array.from(this.clients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      rooms: Array.from(client.rooms),
    }));

    return {
      total: this.clients.size,
      clients,
    };
  }

  /**
   * 关闭服务器
   */
  close(): void {
    this.stopHeartbeat();
    this.io.close();
    logger.info('WebSocket server closed');
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

