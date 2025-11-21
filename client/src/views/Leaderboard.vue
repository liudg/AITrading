<template>
  <div class="min-h-screen bg-cyber-black">
    <Navbar />

    <div class="max-w-7xl mx-auto px-6 py-12">
      <h1 class="text-4xl font-bold text-cyber-green mb-8">排行榜</h1>

      <div class="cyber-card">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-cyber-gray">
                <th class="text-left py-4 px-4 text-sm text-gray-400">排名</th>
                <th class="text-left py-4 px-4 text-sm text-gray-400">模型</th>
                <th class="text-right py-4 px-4 text-sm text-gray-400">总资产</th>
                <th class="text-right py-4 px-4 text-sm text-gray-400">收益率</th>
                <th class="text-right py-4 px-4 text-sm text-gray-400">交易数</th>
                <th class="text-right py-4 px-4 text-sm text-gray-400">胜率</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(model, index) in rankedModels"
                :key="model.id"
                class="border-b border-cyber-gray/50 hover:bg-cyber-light transition-colors"
              >
                <td class="py-4 px-4">
                  <div class="flex items-center space-x-2">
                    <span class="text-2xl">{{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1) }}</span>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <div>
                    <div class="font-bold">{{ model.displayName }}</div>
                    <div class="text-xs text-gray-400">{{ model.name }}</div>
                  </div>
                </td>
                <td class="py-4 px-4 text-right">
                  <span class="font-bold text-cyber-green">
                    ${{ tradingStore.portfolios[model.id]?.totalValue.toFixed(2) || '0.00' }}
                  </span>
                </td>
                <td class="py-4 px-4 text-right">
                  <span
                    v-if="tradingStore.portfolios[model.id]?.performance"
                    :class="[
                      'font-bold',
                      tradingStore.portfolios[model.id]!.performance!.totalReturnPct >= 0
                        ? 'text-cyber-green'
                        : 'text-cyber-red',
                    ]"
                  >
                    {{ tradingStore.portfolios[model.id]!.performance!.totalReturnPct >= 0 ? '+' : '' }}
                    {{ tradingStore.portfolios[model.id]!.performance!.totalReturnPct.toFixed(2) }}%
                  </span>
                </td>
                <td class="py-4 px-4 text-right">
                  {{ tradingStore.trades.filter(t => t.modelId === model.id).length }}
                </td>
                <td class="py-4 px-4 text-right">
                  <span class="text-gray-400">N/A</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Navbar from '@/components/layout/Navbar.vue';
import { useTradingStore } from '@/stores/trading.store';

const tradingStore = useTradingStore();

// 按总资产排序模型
const rankedModels = computed(() => {
  return [...tradingStore.models].sort((a, b) => {
    const aValue = tradingStore.portfolios[a.id]?.totalValue || 0;
    const bValue = tradingStore.portfolios[b.id]?.totalValue || 0;
    return bValue - aValue;
  });
});
</script>

