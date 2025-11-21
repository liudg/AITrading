<template>
  <div class="h-screen bg-cyber-black overflow-hidden flex flex-col">
    <!-- Navbar -->
    <div class="flex-shrink-0">
      <Navbar />
    </div>

    <!-- Main Content -->
    <div class="flex-1 px-6 pt-4 pb-6 overflow-y-auto flex flex-col min-h-0">
      <!-- Models Performance Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4 flex-shrink-0">
        <div
          v-for="model in tradingStore.models"
          :key="model.id"
          class="cyber-card transition-all"
        >
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-white p-2">
                <img 
                  :src="getModelIconPath(model.name)" 
                  :alt="model.displayName"
                  class="w-full h-full object-contain"
                />
              </div>
              <div>
                <div class="text-lg font-bold">{{ model.displayName }}</div>
                <div class="text-xs text-gray-400">{{ model.name }}</div>
              </div>
            </div>
            <div
              :class="[
                'text-sm px-3 py-1 rounded',
                model.enabled ? 'bg-cyber-green/20 text-cyber-green' : 'bg-gray-700 text-gray-400',
              ]"
            >
              {{ model.enabled ? '活跃' : '未激活' }}
            </div>
          </div>

          <div v-if="tradingStore.portfolios[model.id]" class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs text-gray-400 mb-1">总资产</div>
              <div class="text-xl font-bold text-cyber-green">
                ${{ tradingStore.portfolios[model.id].totalValue.toFixed(2) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">现金</div>
              <div class="text-xl font-bold">
                ${{ tradingStore.portfolios[model.id].cash.toFixed(2) }}
              </div>
            </div>
            <div v-if="tradingStore.portfolios[model.id].performance">
              <div class="text-xs text-gray-400 mb-1">收益率</div>
              <div
                :class="[
                  'text-lg font-bold',
                  tradingStore.portfolios[model.id].performance!.totalReturnPct >= 0
                    ? 'text-cyber-green'
                    : 'text-cyber-red',
                ]"
              >
                {{ tradingStore.portfolios[model.id].performance!.totalReturnPct >= 0 ? '+' : '' }}
                {{ tradingStore.portfolios[model.id].performance!.totalReturnPct.toFixed(2) }}%
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">持仓数</div>
              <div class="text-lg font-bold">{{ tradingStore.portfolios[model.id].positions.length }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart & Details -->
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        <!-- Chart Area -->
        <div class="lg:col-span-2 cyber-card flex flex-col min-h-0">
          <div class="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 class="text-xl font-bold">资产净值对比</h3>
            <div class="flex space-x-2">
              <button
                v-for="range in timeRanges"
                :key="range.value"
                @click="selectedTimeRange = range.value"
                class="cyber-button text-xs"
                :class="{
                  'bg-cyber-green/20 border-cyber-green text-cyber-green': selectedTimeRange === range.value,
                }"
              >
                {{ range.label }}
              </button>
            </div>
          </div>
          <div class="flex-1 min-h-0">
            <PerformanceChart
              v-if="tradingStore.models.length > 0"
              :model-ids="modelIds"
              :time-range="selectedTimeRange"
              view-mode="value"
            />
            <div v-else class="h-full flex items-center justify-center text-gray-500">
              暂无数据
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="cyber-card flex flex-col min-h-0">
          <div class="flex space-x-2 mb-4 overflow-x-auto border-b border-cyber-gray pb-2 flex-shrink-0">
            <button
              v-for="tab in sidebarTabs"
              :key="tab.id"
              @click="selectedTab = tab.id"
              class="cyber-button whitespace-nowrap text-sm px-3 py-2"
              :class="{
                'bg-cyber-green/20 border-cyber-green text-cyber-green': selectedTab === tab.id,
              }"
            >
              {{ tab.name }}
            </button>
          </div>

          <!-- Model Filter (for trades, chat, positions) -->
          <div v-if="selectedTab !== 'details'" class="mb-4 flex-shrink-0">
            <div class="flex items-center space-x-2">
              <label class="text-xs text-gray-400 whitespace-nowrap">筛选:</label>
              <select
                v-model="selectedFilterModelId"
                class="cyber-input text-sm py-1 px-2 flex-1"
              >
                <option value="">所有模型</option>
                <option v-for="model in tradingStore.models" :key="model.id" :value="model.id">
                  {{ model.displayName }}
                </option>
              </select>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto pr-2" style="min-height: 0;">
            <!-- Completed Trades -->
            <div v-if="selectedTab === 'trades'">
              <div v-if="filteredTrades.length === 0" class="text-center text-gray-500 py-8">
                暂无交易记录
              </div>
              <div v-else class="space-y-2 pb-4">
                <div
                  v-for="trade in filteredTrades.slice(0, 20)"
                  :key="trade.id"
                  class="cyber-card text-sm hover:border-cyber-green transition-colors"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                      <span class="font-bold">{{ trade.symbol }}</span>
                      <!-- 模型图标 + 名称 -->
                      <div class="flex items-center space-x-1">
                        <div class="w-4 h-4 rounded-full overflow-hidden bg-white p-0.5 flex-shrink-0">
                          <img 
                            :src="getModelIconPath(getModelById(trade.modelId)?.name || '')" 
                            :alt="getModelName(trade.modelId)"
                            class="w-full h-full object-contain"
                          />
                        </div>
                        <span class="text-xs text-gray-500">{{ getModelName(trade.modelId) }}</span>
                      </div>
                    </div>
                    <span
                      :class="['text-xs px-2 py-1 rounded', trade.side === 'BUY' ? 'bg-cyber-green/20 text-cyber-green' : 'bg-cyber-red/20 text-cyber-red']"
                    >
                      {{ trade.side === 'BUY' ? '买入' : '卖出' }}
                    </span>
                  </div>
                  
                  <!-- 交易信息 -->
                  <div class="text-xs text-gray-400 space-y-1">
                    <div class="flex items-center justify-between">
                      <span>数量: {{ trade.quantity }} 股</span>
                      <span>价格: ${{ trade.price.toFixed(2) }}</span>
                    </div>
                    
                    <!-- 卖出时显示成本价 -->
                    <div v-if="trade.side === 'SELL' && trade.avgCost" class="flex items-center justify-between">
                      <span class="text-gray-500">成本价: ${{ trade.avgCost.toFixed(2) }}</span>
                      <span class="text-gray-500">总额: ${{ (trade.quantity * trade.price).toFixed(2) }}</span>
                    </div>
                    
                    <!-- 买入时只显示总额 -->
                    <div v-if="trade.side === 'BUY'" class="text-right text-gray-500">
                      总额: ${{ (trade.quantity * trade.price).toFixed(2) }}
                    </div>
                  </div>
                  
                  <!-- 盈亏和时间 -->
                  <div class="flex items-center justify-between mt-2 pt-2 border-t border-cyber-gray/30">
                    <div v-if="trade.pnl !== null" class="text-xs" :class="trade.pnl! >= 0 ? 'text-cyber-green' : 'text-cyber-red'">
                      盈亏: {{ trade.pnl! >= 0 ? '+' : '' }}${{ trade.pnl!.toFixed(2) }} ({{ trade.pnl! >= 0 ? '+' : '' }}{{ ((trade.pnl! / (trade.quantity * (trade.avgCost || trade.price))) * 100).toFixed(2) }}%)
                    </div>
                    <div v-else class="text-xs text-gray-500">
                      持仓中
                    </div>
                    <!-- 交易时间 -->
                    <div class="text-xs text-gray-500">
                      {{ formatTradeTime(trade.executedAt || trade.createdAt) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Model Chat (思考过程) -->
            <div v-if="selectedTab === 'chat'">
              <div class="text-center text-gray-500 py-8">
                模型思考日志将在此显示
              </div>
            </div>

            <!-- Positions -->
            <div v-if="selectedTab === 'positions'">
              <div v-if="positionsByModel.length === 0" class="text-center text-gray-500 py-8">
                暂无持仓
              </div>
              <div v-else class="space-y-3 pb-4">
                <!-- 按模型分组显示 -->
                <div
                  v-for="modelGroup in positionsByModel"
                  :key="modelGroup.modelId"
                  class="border border-cyber-gray rounded-lg overflow-hidden"
                >
                  <!-- 模型标题 -->
                  <div class="bg-cyber-light px-3 py-2 border-b border-cyber-gray">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <div class="w-5 h-5 rounded-full overflow-hidden bg-white p-0.5 flex-shrink-0">
                          <img 
                            :src="getModelIconPath(modelGroup.modelName)" 
                            :alt="modelGroup.displayName"
                            class="w-full h-full object-contain"
                          />
                        </div>
                        <span class="text-sm font-bold">{{ modelGroup.displayName }}</span>
                      </div>
                      <div class="text-xs" :class="modelGroup.totalPnL >= 0 ? 'text-cyber-green' : 'text-cyber-red'">
                        总盈亏: {{ modelGroup.totalPnL >= 0 ? '+' : '' }}${{ modelGroup.totalPnL.toFixed(2) }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- 持仓列表 -->
                  <div class="divide-y divide-cyber-gray/30">
                    <div
                      v-for="pos in modelGroup.positions"
                      :key="pos.symbol"
                      class="px-3 py-2 hover:bg-cyber-light/50 transition-colors"
                    >
                      <div class="flex items-start justify-between mb-1">
                        <div class="flex items-center space-x-2">
                          <span class="font-bold text-sm">{{ pos.symbol }}</span>
                          <span class="text-xs text-gray-500">{{ pos.quantity }} 股</span>
                        </div>
                        <div class="text-xs" :class="pos.unrealizedPnL >= 0 ? 'text-cyber-green' : 'text-cyber-red'">
                          {{ pos.unrealizedPnL >= 0 ? '+' : '' }}${{ pos.unrealizedPnL.toFixed(2) }}
                        </div>
                      </div>
                      
                      <div class="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div class="text-gray-500">平均成本</div>
                          <div class="text-gray-300">${{ pos.avgPrice.toFixed(2) }}</div>
                        </div>
                        <div>
                          <div class="text-gray-500">当前价格</div>
                          <div class="text-gray-300">${{ pos.currentPrice.toFixed(2) }}</div>
                        </div>
                        <div>
                          <div class="text-gray-500">市值</div>
                          <div class="text-gray-300">${{ pos.marketValue.toFixed(2) }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Competition Details -->
            <div v-if="selectedTab === 'details'">
              <div class="space-y-3 text-sm pb-4">
                <div>
                  <div class="text-gray-400 mb-1">策略</div>
                  <div class="font-bold">新基线策略</div>
                </div>
                <div>
                  <div class="text-gray-400 mb-1">股票池</div>
                  <div v-if="tradingStore.stockPool.length > 0" class="flex flex-wrap gap-1">
                    <span v-for="symbol in tradingStore.stockPool" :key="symbol" class="px-2 py-1 bg-cyber-light rounded text-xs">
                      {{ symbol }}
                    </span>
                  </div>
                  <div v-else class="text-gray-500">暂无股票</div>
                </div>
                <div>
                  <div class="text-gray-400 mb-1">活跃模型</div>
                  <div>{{ tradingStore.models.filter(m => m.enabled).length }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Navbar from '@/components/layout/Navbar.vue';
import PerformanceChart from '@/components/charts/PerformanceChart.vue';
import { useTradingStore } from '@/stores/trading.store';

const tradingStore = useTradingStore();

const selectedTab = ref('trades');
const selectedFilterModelId = ref('');

const sidebarTabs = [
  { id: 'trades', name: '已完成交易' },
  { id: 'chat', name: '模型对话' },
  { id: 'positions', name: '当前持仓' },
  { id: 'details', name: '竞赛详情' },
];

// 图表配置
const selectedTimeRange = ref(72);

const timeRanges = [
  { label: '全部', value: 720 }, // 30 days
  { label: '72小时', value: 72 },
  { label: '24小时', value: 24 },
];

// 模型ID列表 - 使用computed避免每次渲染都创建新数组
const modelIds = computed(() => tradingStore.models.map((m) => m.id));

// 过滤后的交易记录
const filteredTrades = computed(() => {
  if (!selectedFilterModelId.value) {
    return tradingStore.trades;
  }
  return tradingStore.trades.filter(trade => trade.modelId === selectedFilterModelId.value);
});

// 过滤后的持仓
const filteredPositions = computed(() => {
  if (!selectedFilterModelId.value) {
    // 显示所有模型的持仓
    const allPositions: any[] = [];
    Object.values(tradingStore.portfolios).forEach(portfolio => {
      if (portfolio && portfolio.positions) {
        allPositions.push(...portfolio.positions);
      }
    });
    return allPositions;
  }
  // 显示选定模型的持仓
  const portfolio = tradingStore.portfolios[selectedFilterModelId.value];
  return portfolio?.positions || [];
});

// 按模型分组的持仓（用于当前持仓标签页）
const positionsByModel = computed(() => {
  const groups: any[] = [];
  
  // 如果选择了特定模型，只显示该模型
  if (selectedFilterModelId.value) {
    const model = tradingStore.models.find(m => m.id === selectedFilterModelId.value);
    const portfolio = tradingStore.portfolios[selectedFilterModelId.value];
    
    if (model && portfolio && portfolio.positions.length > 0) {
      const totalPnL = portfolio.positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
      groups.push({
        modelId: model.id,
        modelName: model.name,
        displayName: model.displayName,
        positions: portfolio.positions,
        totalPnL,
      });
    }
  } else {
    // 显示所有模型的持仓
    tradingStore.models.forEach(model => {
      const portfolio = tradingStore.portfolios[model.id];
      if (portfolio && portfolio.positions.length > 0) {
        const totalPnL = portfolio.positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
        groups.push({
          modelId: model.id,
          modelName: model.name,
          displayName: model.displayName,
          positions: portfolio.positions,
          totalPnL,
        });
      }
    });
  }
  
  return groups;
});

// 获取模型对象
const getModelById = (modelId: string) => {
  return tradingStore.models.find(m => m.id === modelId);
};

// 获取模型名称
const getModelName = (modelId: string) => {
  const model = getModelById(modelId);
  return model?.displayName || '';
};

// 获取模型图标路径
const getModelIconPath = (modelName: string) => {
  const name = modelName.toLowerCase();
  
  // 映射模型名到图标文件名
  let iconName = '';
  if (name.includes('deepseek')) iconName = 'deepseek';
  else if (name.includes('qwen')) iconName = 'qwen';
  else if (name.includes('gpt') || name.includes('openai')) iconName = 'gpt';
  else if (name.includes('claude')) iconName = 'claude';
  else if (name.includes('gemini')) iconName = 'gemini';
  else if (name.includes('llama')) iconName = 'llama';
  else if (name.includes('mistral')) iconName = 'mistral';
  else if (name.includes('yi')) iconName = 'yi';
  else iconName = 'default'; // 未知模型使用默认图标
  
  // 返回图标路径
  return `/src/assets/models/${iconName}.png`;
};

// 格式化交易时间
const formatTradeTime = (dateString: string | undefined) => {
  if (!dateString) return '未知';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // 如果是今天
  if (diffDays === 0) {
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
  }
  
  // 如果是昨天或更早
  if (diffDays === 1) return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return `${diffDays}天前`;
  
  // 超过一周显示完整日期
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + 
         date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};
</script>

