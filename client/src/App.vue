<template>
  <div class="min-h-screen bg-cyber-black text-gray-200">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue';
import { useTradingStore } from '@/stores/trading.store';
import { useWebSocket } from '@/composables/useWebSocket';
import { WSMessageType, type WSMessage } from '@/types';

const tradingStore = useTradingStore();
const { messages, connect, disconnect } = useWebSocket();

// 初始化应用
onMounted(async () => {
  // 1. 初始化 WebSocket 连接（全局单例）
  connect();
  console.log('[App] WebSocket initialized');

  // 2. 初始化数据
  await tradingStore.initialize();
});

// 应用卸载时断开连接
onBeforeUnmount(() => {
  disconnect();
  console.log('[App] WebSocket disconnected');
});

// 监听 WebSocket 消息
watch(
  messages,
  (newMessages) => {
    if (newMessages.length === 0) return;

    const latestMessage = newMessages[newMessages.length - 1];
    handleWebSocketMessage(latestMessage);
  },
  { deep: true }
);

function handleWebSocketMessage(message: WSMessage) {
  const { type, payload } = message;

  switch (type) {
    case WSMessageType.PORTFOLIO_UPDATE:
      if (payload.modelId && payload.portfolio) {
        tradingStore.updatePortfolio(payload.modelId, payload.portfolio);
      }
      break;

    case WSMessageType.TRADE_EXECUTED:
      if (payload.trade) {
        tradingStore.addTrade(payload.trade);
      }
      break;

    case WSMessageType.REFLECTION_CREATED:
      if (payload.reflection) {
        tradingStore.addReflection(payload.reflection);
      }
      break;

    case WSMessageType.MODEL_THINKING:
      console.log(`[Model ${payload.modelId}]: ${payload.content}`);
      break;

    case WSMessageType.ERROR:
      console.error('[WebSocket Error]:', payload.error);
      break;
  }
}
</script>

