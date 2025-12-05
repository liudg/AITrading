<template>
  <div class="min-h-screen bg-cyber-black">
    <Navbar />

    <div class="max-w-7xl mx-auto px-6 py-12">
      <h1 class="text-4xl font-bold text-cyber-green mb-8">AI 智能选股</h1>

      <!-- Tab Navigation -->
      <div class="flex space-x-4 mb-8 border-b border-cyber-gray">
        <button
          @click="activeTab = 'batch'"
          :class="[
            'px-6 py-3 text-sm font-medium transition-all',
            activeTab === 'batch'
              ? 'text-cyber-green border-b-2 border-cyber-green'
              : 'text-gray-400 hover:text-gray-200',
          ]"
        >
          批量选股
        </button>
        <button
          @click="activeTab = 'single'"
          :class="[
            'px-6 py-3 text-sm font-medium transition-all',
            activeTab === 'single'
              ? 'text-cyber-green border-b-2 border-cyber-green'
              : 'text-gray-400 hover:text-gray-200',
          ]"
        >
          单一股票分析
        </button>
      </div>

      <!-- Batch Stock Picker Tab -->
      <div v-show="activeTab === 'batch'" class="space-y-6">
        <!-- Input Form -->
        <div v-if="!batchRecommendations.length" class="cyber-card">
          <h3 class="text-xl font-bold text-cyber-green mb-4">设置筛选条件</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">筛选条件</label>
              <textarea
                v-model="batchCriteria"
                rows="4"
                class="cyber-input w-full resize-none"
                placeholder="例如: 寻找最近一周新闻热度高的科技股，市值在100亿美元以上"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">最大结果数</label>
                <input v-model.number="batchMaxResults" type="number" min="5" max="20" class="cyber-input w-full" />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2">目标收益率</label>
                <input
                  v-model="targetReturn"
                  type="text"
                  class="cyber-input w-full"
                  placeholder="例如: 20%"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <button
                @click="performBatchPicking"
                :disabled="batchLoading || !batchCriteria.trim()"
                class="cyber-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="flex items-center justify-center space-x-2">
                  <svg v-if="batchLoading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{{ batchLoading ? 'AI 分析中...' : '开始批量选股' }}</span>
                </span>
              </button>
              
              <button
                @click="loadBatchPromptPreview"
                :disabled="!batchCriteria.trim()"
                class="cyber-button bg-cyber-blue/20 hover:bg-cyber-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="flex items-center justify-center space-x-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>📋 显示提示词</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Prompt Preview -->
        <div v-if="batchShowPrompt && batchPromptPreview" class="cyber-card bg-cyber-light">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-cyber-blue">提示词预览</h3>
            <button @click="batchShowPrompt = false" class="text-sm text-gray-400 hover:text-gray-200">
              ✕ 关闭
            </button>
          </div>

          <div class="space-y-4">
            <!-- System Prompt -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-cyber-green">System Prompt</label>
                <button
                  @click="copyToClipboard(batchPromptPreview.systemPrompt, 'System Prompt')"
                  class="text-xs text-cyber-blue hover:underline"
                >
                  📋 复制
                </button>
              </div>
              <pre class="bg-black/50 p-4 rounded text-xs text-gray-300 overflow-x-auto border border-cyber-gray">{{ batchPromptPreview.systemPrompt }}</pre>
            </div>

            <!-- User Prompt -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-cyber-green">User Prompt</label>
                <button
                  @click="copyToClipboard(batchPromptPreview.userPrompt, 'User Prompt')"
                  class="text-xs text-cyber-blue hover:underline"
                >
                  📋 复制
                </button>
              </div>
              <pre class="bg-black/50 p-4 rounded text-xs text-gray-300 overflow-x-auto border border-cyber-gray max-h-96">{{ batchPromptPreview.userPrompt }}</pre>
            </div>

            <!-- Copy All Button -->
            <button
              @click="copyToClipboard(batchPromptPreview.systemPrompt + '\n\n' + batchPromptPreview.userPrompt, '完整提示词')"
              class="cyber-button w-full bg-cyber-green/20 hover:bg-cyber-green/30"
            >
              📋 复制完整提示词
            </button>
          </div>
        </div>

        <!-- Recommendations -->
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between mb-4">
            <div class="text-lg text-gray-300">
              找到 <span class="text-cyber-green font-bold">{{ batchRecommendations.length }}</span> 只股票
            </div>
            <button @click="resetBatchForm" class="text-sm text-cyber-blue hover:underline">
              重新搜索
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="rec in batchRecommendations"
              :key="rec.symbol"
              class="cyber-card hover:border-cyber-green transition-all cursor-pointer"
              :class="{ 'border-cyber-green bg-cyber-green/5': batchSelectedSymbols.includes(rec.symbol) }"
              @click="toggleBatchSelection(rec.symbol)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-2">
                    <span class="text-lg font-bold text-cyber-green">{{ rec.symbol }}</span>
                    <span class="text-sm text-gray-400">{{ rec.name }}</span>
                    <span class="px-2 py-1 text-xs bg-cyber-yellow/20 text-cyber-yellow rounded">
                      评分: {{ rec.score }}/10
                    </span>
                  </div>
                  <p class="text-sm text-gray-300 leading-relaxed">{{ rec.reason }}</p>
                </div>

                <div class="ml-4">
                  <div
                    class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all"
                    :class="
                      batchSelectedSymbols.includes(rec.symbol)
                        ? 'border-cyber-green bg-cyber-green/20'
                        : 'border-gray-500'
                    "
                  >
                    <svg
                      v-if="batchSelectedSymbols.includes(rec.symbol)"
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
          </div>

          <div class="cyber-card bg-cyber-light">
            <div class="flex space-x-4">
              <button @click="batchSelectAll" class="cyber-button flex-1">全选</button>
              <button @click="batchDeselectAll" class="cyber-button flex-1">取消全选</button>
              <button
                @click="saveBatchSelection"
                :disabled="batchSelectedSymbols.length === 0"
                class="cyber-button flex-1 bg-cyber-green/20 hover:bg-cyber-green/30 disabled:opacity-50"
              >
                保存股票池 ({{ batchSelectedSymbols.length }})
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Single Stock Analysis Tab -->
      <div v-show="activeTab === 'single'" class="space-y-6">
        <!-- Input Form -->
        <div class="cyber-card">
          <h3 class="text-xl font-bold text-cyber-green mb-4">输入股票代码</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">股票代码</label>
              <input
                v-model="singleSymbol"
                type="text"
                class="cyber-input w-full uppercase"
                placeholder="例如: NVDA, TSLA, AAPL"
                @input="singleSymbol = singleSymbol.toUpperCase()"
              />
            </div>

            <div>
              <label class="block text-sm text-gray-400 mb-2">分析维度（可选）</label>
              <textarea
                v-model="singleCriteria"
                rows="3"
                class="cyber-input w-full resize-none"
                placeholder="例如: 从技术面、基本面、市场情绪等角度分析该股票的投资价值"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <button
                @click="performSingleAnalysis"
                :disabled="singleLoading || !singleSymbol.trim()"
                class="cyber-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="flex items-center justify-center space-x-2">
                  <svg v-if="singleLoading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{{ singleLoading ? 'AI 分析中...' : '开始分析' }}</span>
                </span>
              </button>

              <button
                @click="loadSinglePromptPreview"
                :disabled="!singleSymbol.trim()"
                class="cyber-button bg-cyber-blue/20 hover:bg-cyber-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="flex items-center justify-center space-x-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>📋 显示提示词</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Prompt Preview -->
        <div v-if="singleShowPrompt && singlePromptPreview" class="cyber-card bg-cyber-light">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-cyber-blue">提示词预览</h3>
            <button @click="singleShowPrompt = false" class="text-sm text-gray-400 hover:text-gray-200">
              ✕ 关闭
            </button>
          </div>

          <div class="space-y-4">
            <!-- System Prompt -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-cyber-green">System Prompt</label>
                <button
                  @click="copyToClipboard(singlePromptPreview.systemPrompt, 'System Prompt')"
                  class="text-xs text-cyber-blue hover:underline"
                >
                  📋 复制
                </button>
              </div>
              <pre class="bg-black/50 p-4 rounded text-xs text-gray-300 overflow-x-auto border border-cyber-gray">{{ singlePromptPreview.systemPrompt }}</pre>
            </div>

            <!-- User Prompt -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-cyber-green">User Prompt</label>
                <button
                  @click="copyToClipboard(singlePromptPreview.userPrompt, 'User Prompt')"
                  class="text-xs text-cyber-blue hover:underline"
                >
                  📋 复制
                </button>
              </div>
              <pre class="bg-black/50 p-4 rounded text-xs text-gray-300 overflow-x-auto border border-cyber-gray max-h-96">{{ singlePromptPreview.userPrompt }}</pre>
            </div>

            <!-- Copy All Button -->
            <button
              @click="copyToClipboard(singlePromptPreview.systemPrompt + '\n\n' + singlePromptPreview.userPrompt, '完整提示词')"
              class="cyber-button w-full bg-cyber-green/20 hover:bg-cyber-green/30"
            >
              📋 复制完整提示词
            </button>
          </div>
        </div>

        <!-- Analysis Result -->
        <div v-if="singleAnalysis" class="cyber-card">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-cyber-green">{{ singleAnalysis.symbol }}</h3>
            <button @click="resetSingleForm" class="text-sm text-cyber-blue hover:underline">
              分析其他股票
            </button>
          </div>

          <div class="space-y-6">
            <!-- Basic Info -->
            <div class="grid grid-cols-2 gap-4 pb-6 border-b border-cyber-gray">
              <div>
                <div class="text-sm text-gray-400 mb-1">公司名称</div>
                <div class="text-lg font-medium">{{ singleAnalysis.name }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-400 mb-1">综合评分</div>
                <div class="text-lg font-bold text-cyber-green">{{ singleAnalysis.score }}/10</div>
              </div>
            </div>

            <!-- Analysis Content -->
            <div>
              <h4 class="text-lg font-bold text-cyber-blue mb-3">AI 分析报告</h4>
              <div class="text-gray-300 leading-relaxed whitespace-pre-wrap">{{ singleAnalysis.analysis }}</div>
            </div>

            <!-- Investment Recommendation -->
            <div
              class="p-4 rounded-lg"
              :class="
                singleAnalysis.recommendation === '买入'
                  ? 'bg-cyber-green/10 border border-cyber-green/30'
                  : singleAnalysis.recommendation === '观望'
                  ? 'bg-cyber-yellow/10 border border-cyber-yellow/30'
                  : 'bg-cyber-red/10 border border-cyber-red/30'
              "
            >
              <div class="flex items-center space-x-2 mb-2">
                <span class="text-sm text-gray-400">投资建议:</span>
                <span
                  class="text-lg font-bold"
                  :class="
                    singleAnalysis.recommendation === '买入'
                      ? 'text-cyber-green'
                      : singleAnalysis.recommendation === '观望'
                      ? 'text-cyber-yellow'
                      : 'text-cyber-red'
                  "
                >
                  {{ singleAnalysis.recommendation }}
                </span>
              </div>
              <div class="text-sm text-gray-300">{{ singleAnalysis.reason }}</div>
            </div>

            <!-- Add to Stock Pool -->
            <div class="flex space-x-4 pt-4 border-t border-cyber-gray">
              <button
                @click="addSingleToPool"
                class="cyber-button flex-1 bg-cyber-green/20 hover:bg-cyber-green/30"
              >
                添加到股票池
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Navbar from '@/components/layout/Navbar.vue';
import { useTradingStore } from '@/stores/trading.store';
import type { StockRecommendation } from '@/types';

const tradingStore = useTradingStore();

// Tab control
const activeTab = ref<'batch' | 'single'>('batch');

// Batch picking state
const batchCriteria = ref('');
const batchMaxResults = ref(10);
const targetReturn = ref('');
const batchLoading = ref(false);
const batchRecommendations = ref<StockRecommendation[]>([]);
const batchSelectedSymbols = ref<string[]>([]);
const batchPromptPreview = ref<{ systemPrompt: string; userPrompt: string } | null>(null);
const batchShowPrompt = ref(false);

// Single stock analysis state
const singleSymbol = ref('');
const singleCriteria = ref('');
const singleLoading = ref(false);
const singleAnalysis = ref<{
  symbol: string;
  name: string;
  score: number;
  analysis: string;
  recommendation: string;
  reason: string;
} | null>(null);
const singlePromptPreview = ref<{ systemPrompt: string; userPrompt: string } | null>(null);
const singleShowPrompt = ref(false);

// Batch picking functions
async function performBatchPicking() {
  try {
    batchLoading.value = true;
    batchRecommendations.value = await tradingStore.pickStocks(batchCriteria.value, batchMaxResults.value);
    // 默认选中所有推荐的股票
    batchSelectedSymbols.value = batchRecommendations.value.map((r) => r.symbol);
  } catch (error) {
    alert('AI 分析失败，请重试');
    console.error(error);
  } finally {
    batchLoading.value = false;
  }
}

async function loadBatchPromptPreview() {
  if (!batchCriteria.value.trim()) return;
  
  try {
    batchPromptPreview.value = await tradingStore.previewStockPickerPrompt(
      batchCriteria.value,
      batchMaxResults.value
    );
    batchShowPrompt.value = true;
  } catch (error) {
    alert('加载提示词失败');
    console.error(error);
  }
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => {
    alert(`${label}已复制到剪贴板`);
  }).catch(() => {
    alert('复制失败，请手动复制');
  });
}

function toggleBatchSelection(symbol: string) {
  const index = batchSelectedSymbols.value.indexOf(symbol);
  if (index > -1) {
    batchSelectedSymbols.value.splice(index, 1);
  } else {
    batchSelectedSymbols.value.push(symbol);
  }
}

function batchSelectAll() {
  batchSelectedSymbols.value = batchRecommendations.value.map((r) => r.symbol);
}

function batchDeselectAll() {
  batchSelectedSymbols.value = [];
}

async function saveBatchSelection() {
  try {
    batchLoading.value = true;
    await tradingStore.saveStockPool(batchSelectedSymbols.value, 'AI Selected Stocks', batchCriteria.value);
    alert(`成功保存 ${batchSelectedSymbols.value.length} 只股票到股票池！`);
    resetBatchForm();
  } catch (error) {
    alert('保存失败，请重试');
    console.error(error);
  } finally {
    batchLoading.value = false;
  }
}

function resetBatchForm() {
  batchCriteria.value = '';
  batchMaxResults.value = 10;
  targetReturn.value = '';
  batchRecommendations.value = [];
  batchSelectedSymbols.value = [];
}

// Single stock analysis functions
async function performSingleAnalysis() {
  try {
    singleLoading.value = true;
    
    // 调用后端API进行单一股票分析
    singleAnalysis.value = await tradingStore.analyzeSingleStock(
      singleSymbol.value,
      singleCriteria.value || undefined
    );
  } catch (error) {
    alert('AI 分析失败，请重试');
    console.error(error);
  } finally {
    singleLoading.value = false;
  }
}

async function loadSinglePromptPreview() {
  if (!singleSymbol.value.trim()) return;
  
  try {
    singlePromptPreview.value = await tradingStore.previewStockAnalysisPrompt(
      singleSymbol.value,
      singleCriteria.value || undefined
    );
    singleShowPrompt.value = true;
  } catch (error) {
    alert('加载提示词失败');
    console.error(error);
  }
}

async function addSingleToPool() {
  if (!singleAnalysis.value) return;
  
  try {
    await tradingStore.saveStockPool(
      [singleAnalysis.value.symbol],
      `单一分析: ${singleAnalysis.value.symbol}`,
      `评分: ${singleAnalysis.value.score}/10 - ${singleAnalysis.value.recommendation}`
    );
    alert(`成功添加 ${singleAnalysis.value.symbol} 到股票池！`);
  } catch (error) {
    alert('添加失败，请重试');
    console.error(error);
  }
}

function resetSingleForm() {
  singleSymbol.value = '';
  singleCriteria.value = '';
  singleAnalysis.value = null;
}

// 监听批量选股条件变化，自动刷新提示词预览
watch([batchCriteria, batchMaxResults], () => {
  if (batchShowPrompt.value && batchCriteria.value.trim()) {
    loadBatchPromptPreview();
  }
});

// 监听单一股票分析条件变化，自动刷新提示词预览
watch([singleSymbol, singleCriteria], () => {
  if (singleShowPrompt.value && singleSymbol.value.trim()) {
    loadSinglePromptPreview();
  }
});
</script>

