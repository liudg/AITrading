// WebSocket 连接管理 - 单例模式

import { ref, computed } from "vue";
import { io, Socket } from "socket.io-client";
import { WSMessage } from "@/types";

export enum ConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

// ========== 全局单例状态 ==========
// 这些状态在整个应用中只创建一次，所有组件共享

let socket: Socket | null = null;
const connectionStatus = ref<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
const messages = ref<WSMessage[]>([]);
const reconnectAttempts = ref(0);
const maxReconnectAttempts = 10;
const lastError = ref<string | null>(null);
let pingInterval: NodeJS.Timeout | null = null;
let isInitialized = false; // 防止重复初始化

// 计算属性
const connected = computed(
  () => connectionStatus.value === ConnectionStatus.CONNECTED
);
const isReconnecting = computed(
  () => connectionStatus.value === ConnectionStatus.RECONNECTING
);

// ========== WebSocket管理函数 ==========

const DEFAULT_URL = "http://localhost:3000";
let currentUrl = DEFAULT_URL;

/**
 * 启动心跳检测
 */
const startHeartbeat = () => {
  // 清除旧的心跳
  if (pingInterval) {
    clearInterval(pingInterval);
  }

  // 每30秒发送一次ping
  pingInterval = setInterval(() => {
    if (socket?.connected) {
      socket.emit("ping");
      console.log("[WebSocket] 💓 Ping sent");
    }
  }, 30000);
};

/**
 * 停止心跳检测
 */
const stopHeartbeat = () => {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
};

/**
 * 连接到WebSocket服务器
 * 注意：这个函数应该只在App.vue中调用一次
 */
const connect = (url: string = DEFAULT_URL) => {
  // 防止重复连接
  if (socket?.connected) {
    console.log("[WebSocket] Already connected");
    return;
  }

  // 防止重复初始化
  if (isInitialized && socket) {
    console.log("[WebSocket] Already initialized, reusing existing connection");
    return;
  }

  currentUrl = url;
  connectionStatus.value = ConnectionStatus.CONNECTING;
  lastError.value = null;

  console.log("[WebSocket] 🚀 Initializing connection...");

  socket = io(url, {
    transports: ["websocket", "polling"], // 支持降级
    reconnection: true,
    reconnectionAttempts: maxReconnectAttempts,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  isInitialized = true;

  // 连接成功
  socket.on("connect", () => {
    connectionStatus.value = ConnectionStatus.CONNECTED;
    reconnectAttempts.value = 0;
    lastError.value = null;
    console.log("✅ [WebSocket] Connected");
    startHeartbeat();
  });

  // 欢迎消息
  socket.on("welcome", (data: any) => {
    console.log("[WebSocket] Welcome:", data.message);
    console.log("[WebSocket] Client ID:", data.clientId);
  });

  // 心跳响应
  socket.on("pong", () => {
    console.log("[WebSocket] 💓 Pong received");
  });

  // 断开连接
  socket.on("disconnect", (reason: string) => {
    connectionStatus.value = ConnectionStatus.DISCONNECTED;
    stopHeartbeat();
    console.log(`❌ [WebSocket] Disconnected: ${reason}`);

    // 如果是服务器主动断开或IO错误，记录错误
    if (reason === "io server disconnect" || reason === "transport error") {
      lastError.value = `连接断开: ${reason}`;
    }
  });

  // 重连中
  socket.on("reconnect_attempt", (attemptNumber: number) => {
    connectionStatus.value = ConnectionStatus.RECONNECTING;
    reconnectAttempts.value = attemptNumber;
    console.log(
      `🔄 [WebSocket] Reconnecting... (${attemptNumber}/${maxReconnectAttempts})`
    );
  });

  // 重连失败
  socket.on("reconnect_failed", () => {
    connectionStatus.value = ConnectionStatus.ERROR;
    lastError.value = "重连失败，已达到最大重试次数";
    console.error("❌ [WebSocket] Reconnection failed after max attempts");
  });

  // 连接错误
  socket.on("connect_error", (error: Error) => {
    connectionStatus.value = ConnectionStatus.ERROR;
    lastError.value = error.message;
    console.error("[WebSocket] Connection error:", error.message);
  });

  // 接收消息
  socket.on("message", (message: WSMessage) => {
    messages.value.push(message);
    console.log("[WebSocket] 📨 Message received:", message.type);
  });

  // 订阅确认
  socket.on("subscribed", (data: { room: string }) => {
    console.log(`[WebSocket] ✅ Subscribed to ${data.room}`);
  });

  // 取消订阅确认
  socket.on("unsubscribed", (data: { room: string }) => {
    console.log(`[WebSocket] ✅ Unsubscribed from ${data.room}`);
  });
};

/**
 * 断开连接
 * 注意：这个函数应该只在App.vue卸载时调用
 */
const disconnect = () => {
  if (socket) {
    stopHeartbeat();
    socket.disconnect();
    socket = null;
    isInitialized = false;
    connectionStatus.value = ConnectionStatus.DISCONNECTED;
    console.log("[WebSocket] Disconnected");
  }
};

/**
 * 手动重连
 */
const reconnect = () => {
  disconnect();
  setTimeout(() => {
    connect(currentUrl);
  }, 500);
};

/**
 * 订阅房间
 */
const subscribe = (room: string) => {
  if (socket?.connected) {
    socket.emit("subscribe", room);
    console.log(`[WebSocket] 📝 Subscribing to ${room}`);
  } else {
    console.warn("[WebSocket] Cannot subscribe: not connected");
  }
};

/**
 * 取消订阅房间
 */
const unsubscribe = (room: string) => {
  if (socket?.connected) {
    socket.emit("unsubscribe", room);
    console.log(`[WebSocket] 📝 Unsubscribing from ${room}`);
  }
};

/**
 * 清空消息
 */
const clearMessages = () => {
  messages.value = [];
};

/**
 * 获取连接状态描述
 */
const getStatusText = () => {
  const texts = {
    [ConnectionStatus.DISCONNECTED]: "未连接",
    [ConnectionStatus.CONNECTING]: "连接中...",
    [ConnectionStatus.CONNECTED]: "已连接",
    [ConnectionStatus.RECONNECTING]: `重连中 (${reconnectAttempts.value}/${maxReconnectAttempts})`,
    [ConnectionStatus.ERROR]: "连接错误",
  };
  return texts[connectionStatus.value];
};

/**
 * 获取连接状态颜色
 */
const getStatusColor = () => {
  const colors = {
    [ConnectionStatus.DISCONNECTED]: "text-gray-400",
    [ConnectionStatus.CONNECTING]: "text-yellow-400",
    [ConnectionStatus.CONNECTED]: "text-cyber-green",
    [ConnectionStatus.RECONNECTING]: "text-yellow-400",
    [ConnectionStatus.ERROR]: "text-cyber-red",
  };
  return colors[connectionStatus.value];
};

// ========== 导出 Composable ==========

/**
 * WebSocket Composable（单例模式）
 *
 * 使用方式：
 * 1. 在 App.vue 中调用 connect() 初始化连接
 * 2. 在其他组件中调用 useWebSocket() 访问共享的连接状态
 * 3. 在 App.vue 卸载时调用 disconnect() 断开连接
 *
 * 注意：所有组件共享同一个 WebSocket 连接和状态
 */
export function useWebSocket() {
  // 如果还未初始化，给出提示
  if (!isInitialized && !socket) {
    console.warn(
      "[WebSocket] Not initialized yet. Please call connect() in App.vue first."
    );
  }

  return {
    // 状态（只读，所有组件共享）
    socket,
    connectionStatus,
    connected,
    isReconnecting,
    messages,
    reconnectAttempts,
    maxReconnectAttempts,
    lastError,

    // 方法
    connect, // 仅在 App.vue 中调用
    disconnect, // 仅在 App.vue 中调用
    reconnect, // 可在任意组件中调用（手动重连）
    subscribe,
    unsubscribe,
    clearMessages,
    getStatusText,
    getStatusColor,
  };
}
