<template>
  <div class="min-h-screen bg-cyber-black text-gray-200">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useTradingStore } from '@/stores/trading.store';
import { useWebSocket } from '@/composables/useWebSocket';
import { WSMessageType, type WSMessage } from '@/types';

const tradingStore = useTradingStore();
const { messages } = useWebSocket();

// 初始化数据
onMounted(async () => {
  await tradingStore.initialize();
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

