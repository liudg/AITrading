<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div class="cyber-card max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto slide-up">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-cyber-green">AI 智能选股</h2>
        <button @click="close" class="text-gray-400 hover:text-cyber-red transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Input Form -->
      <div v-if="!recommendations.length" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-2">筛选条件</label>
          <textarea
            v-model="criteria"
            rows="4"
            class="cyber-input w-full resize-none"
            placeholder="例如: 寻找最近一周新闻热度高的科技股"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-2">最大结果数</label>
          <input v-model.number="maxResults" type="number" min="5" max="20" class="cyber-input w-full" />
        </div>

        <button
          @click="pickStocks"
          :disabled="loading || !criteria.trim()"
          class="cyber-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'AI 分析中...' : '开始分析' }}
        </button>
      </div>

      <!-- Recommendations -->
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between mb-4">
          <div class="text-sm text-gray-400">找到 {{ recommendations.length }} 只股票</div>
          <button @click="resetForm" class="text-sm text-cyber-blue hover:underline">重新搜索</button>
        </div>

        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div
            v-for="(rec, index) in recommendations"
            :key="rec.symbol"
            class="cyber-card flex items-start justify-between hover:border-cyber-green transition-colors cursor-pointer"
            :class="{ 'border-cyber-green': selectedSymbols.includes(rec.symbol) }"
            @click="toggleSelection(rec.symbol)"
          >
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <span class="text-lg font-bold text-cyber-green">{{ rec.symbol }}</span>
                <span class="text-sm text-gray-400">{{ rec.name }}</span>
                <span class="text-xs text-cyber-yellow">评分: {{ rec.score }}</span>
              </div>
              <p class="text-sm text-gray-300">{{ rec.reason }}</p>
            </div>

            <div class="ml-4">
              <div
                class="w-6 h-6 rounded border-2 flex items-center justify-center"
                :class="selectedSymbols.includes(rec.symbol) ? 'border-cyber-green bg-cyber-green/20' : 'border-gray-500'"
              >
                <svg
                  v-if="selectedSymbols.includes(rec.symbol)"
                  class="w-4 h-4 text-cyber-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="flex space-x-4 pt-4 border-t border-cyber-gray">
          <button @click="selectAll" class="cyber-button flex-1">全选</button>
          <button @click="deselectAll" class="cyber-button flex-1">取消全选</button>
          <button
            @click="saveSelection"
            :disabled="selectedSymbols.length === 0"
            class="cyber-button flex-1 bg-cyber-green/10 hover:bg-cyber-green/20 disabled:opacity-50"
          >
            保存 ({{ selectedSymbols.length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTradingStore } from '@/stores/trading.store';
import type { StockRecommendation } from '@/types';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const tradingStore = useTradingStore();

const criteria = ref('');
const maxResults = ref(10);
const loading = ref(false);
const recommendations = ref<StockRecommendation[]>([]);
const selectedSymbols = ref<string[]>([]);

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      resetForm();
    }
  }
);

function close() {
  emit('update:modelValue', false);
}

async function pickStocks() {
  try {
    loading.value = true;
    recommendations.value = await tradingStore.pickStocks(criteria.value, maxResults.value);
    // 默认选中所有推荐的股票
    selectedSymbols.value = recommendations.value.map((r) => r.symbol);
  } catch (error) {
    alert('AI analysis failed. Please try again.');
  } finally {
    loading.value = false;
  }
}

function toggleSelection(symbol: string) {
  const index = selectedSymbols.value.indexOf(symbol);
  if (index > -1) {
    selectedSymbols.value.splice(index, 1);
  } else {
    selectedSymbols.value.push(symbol);
  }
}

function selectAll() {
  selectedSymbols.value = recommendations.value.map((r) => r.symbol);
}

function deselectAll() {
  selectedSymbols.value = [];
}

async function saveSelection() {
  try {
    loading.value = true;
    await tradingStore.saveStockPool(selectedSymbols.value, 'AI Selected Stocks', criteria.value);
    alert(`Successfully saved ${selectedSymbols.value.length} stocks to the pool!`);
    close();
  } catch (error) {
    alert('Failed to save stock pool. Please try again.');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  criteria.value = '';
  maxResults.value = 10;
  recommendations.value = [];
  selectedSymbols.value = [];
}
</script>

