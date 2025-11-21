// WebSocket 连接管理

import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { WSMessage } from '@/types';

export function useWebSocket(url: string = 'http://localhost:3000') {
  const socket = ref<Socket | null>(null);
  const connected = ref(false);
  const messages = ref<WSMessage[]>([]);

  const connect = () => {
    socket.value = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.value.on('connect', () => {
      connected.value = true;
      console.log('[WebSocket] Connected');
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
      console.log('[WebSocket] Disconnected');
    });

    socket.value.on('message', (message: WSMessage) => {
      messages.value.push(message);
      console.log('[WebSocket] Message received:', message.type);
    });

    socket.value.on('error', (error: any) => {
      console.error('[WebSocket] Error:', error);
    });
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
  };

  const subscribe = (room: string) => {
    if (socket.value) {
      socket.value.emit('subscribe', room);
      console.log(`[WebSocket] Subscribed to ${room}`);
    }
  };

  const unsubscribe = (room: string) => {
    if (socket.value) {
      socket.value.emit('unsubscribe', room);
      console.log(`[WebSocket] Unsubscribed from ${room}`);
    }
  };

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    socket,
    connected,
    messages,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}

