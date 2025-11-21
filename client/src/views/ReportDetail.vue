<template>
  <div class="min-h-screen bg-cyber-black">
    <Navbar />

    <div class="max-w-7xl mx-auto px-6 py-12">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="cyber-card p-8 text-center text-gray-400">
        加载中...
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="cyber-card p-8 text-center">
        <p class="text-cyber-red mb-4">{{ error }}</p>
        <router-link to="/reports" class="text-cyber-green hover:text-cyber-green/80">
          返回战报列表
        </router-link>
      </div>

      <!-- 战报详情 -->
      <div v-else-if="report">
        <!-- 返回按钮 -->
        <router-link
          to="/reports"
          class="inline-flex items-center text-cyber-green hover:text-cyber-green/80 mb-6"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回战报列表
        </router-link>

        <!-- 标题 -->
        <div class="mb-8">
          <div class="flex items-center space-x-4 mb-3">
            <span class="text-2xl font-bold text-cyber-green">Day {{ report.day }}</span>
            <span class="text-gray-400">{{ formatDate(report.date) }}</span>
          </div>
          <h1 class="text-3xl font-bold text-white mb-4">{{ report.title }}</h1>
          <p v-if="report.overallInsight" class="text-lg text-gray-300 bg-cyber-light p-4 rounded-lg border border-cyber-gray">
            {{ report.overallInsight }}
          </p>
        </div>

        <!-- 快速洞察卡片区 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <!-- MVP -->
          <div class="cyber-card bg-gradient-to-br from-cyber-light to-cyber-black border-cyber-green/30">
            <div class="text-xs text-gray-400 mb-1">🏆 今日 MVP</div>
            <div class="text-xl font-bold text-cyber-green">{{ getBestPerformer().name }}</div>
            <div class="text-sm text-cyber-green">{{ getBestPerformer().return }}</div>
          </div>

          <!-- 垫底 -->
          <div class="cyber-card bg-gradient-to-br from-cyber-light to-cyber-black border-cyber-red/30">
            <div class="text-xs text-gray-400 mb-1">💩 今日垫底</div>
            <div class="text-xl font-bold text-cyber-red">{{ getWorstPerformer().name }}</div>
            <div class="text-sm text-cyber-red">{{ getWorstPerformer().return }}</div>
          </div>

          <!-- 平均收益 -->
          <div class="cyber-card bg-gradient-to-br from-cyber-light to-cyber-black">
            <div class="text-xs text-gray-400 mb-1">📈 平均收益</div>
            <div class="text-xl font-bold" :class="getAverageReturn() >= 0 ? 'text-cyber-green' : 'text-cyber-red'">
              {{ getAverageReturn() >= 0 ? '+' : '' }}{{ getAverageReturn().toFixed(2) }}%
            </div>
            <div class="text-sm text-gray-400">{{ report.modelPerformances.length }} 个模型</div>
          </div>

          <!-- 交易最活跃 -->
          <div class="cyber-card bg-gradient-to-br from-cyber-light to-cyber-black">
            <div class="text-xs text-gray-400 mb-1">🔥 交易最活跃</div>
            <div class="text-xl font-bold text-white">{{ getMostActive().name }}</div>
            <div class="text-sm text-gray-400">{{ getMostActive().trades }} 笔交易</div>
          </div>
        </div>

        <!-- 模型表现对比表 -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-cyber-green mb-4">📊 模型表现对比</h2>
          <div class="cyber-card overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="border-b border-cyber-gray bg-cyber-light">
                  <th class="text-left py-4 px-4 text-sm text-gray-400">排名</th>
                  <th class="text-left py-4 px-4 text-sm text-gray-400">模型</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">总资产</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">收益率</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">当日盈亏</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">仓位</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">持仓数</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">交易数</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">胜率</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(perf, index) in report.modelPerformances"
                  :key="perf.id"
                  class="border-b border-cyber-gray/50 hover:bg-cyber-light transition-colors"
                >
                  <td class="py-4 px-4">
                    <div class="flex items-center space-x-2">
                      <span class="text-xl">
                        {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1) }}
                      </span>
                      <!-- 排名变化 -->
                      <span v-if="perf.rankChange !== null && perf.rankChange !== undefined" class="text-sm">
                        <span v-if="perf.rankChange > 0" class="text-cyber-green">⬆️ +{{ perf.rankChange }}</span>
                        <span v-else-if="perf.rankChange < 0" class="text-cyber-red">⬇️ {{ perf.rankChange }}</span>
                        <span v-else class="text-gray-400">➖</span>
                      </span>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <span class="font-bold text-white">{{ perf.modelName }}</span>
                  </td>
                  <td class="py-4 px-4 text-right">
                    <span class="font-bold text-cyber-green">${{ perf.totalValue.toFixed(2) }}</span>
                  </td>
                  <td class="py-4 px-4 text-right">
                    <span :class="perf.returnPct >= 0 ? 'text-cyber-green' : 'text-cyber-red'" class="font-bold">
                      {{ perf.returnPct >= 0 ? '+' : '' }}{{ perf.returnPct.toFixed(2) }}%
                    </span>
                  </td>
                  <!-- 当日盈亏（金额 + 百分比） -->
                  <td class="py-4 px-4 text-right">
                    <div v-if="perf.dailyReturn !== null && perf.dailyReturnPct !== null">
                      <div :class="(perf.dailyReturn || 0) >= 0 ? 'text-cyber-green' : 'text-cyber-red'" class="font-bold">
                        {{ (perf.dailyReturn || 0) >= 0 ? '+' : '' }}${{ Math.abs(perf.dailyReturn || 0).toFixed(2) }}
                      </div>
                      <div :class="(perf.dailyReturnPct || 0) >= 0 ? 'text-cyber-green' : 'text-cyber-red'" class="text-xs">
                        ({{ (perf.dailyReturnPct || 0) >= 0 ? '+' : '' }}{{ (perf.dailyReturnPct || 0).toFixed(2) }}%)
                      </div>
                    </div>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <!-- 仓位状态 -->
                  <td class="py-4 px-4 text-right">
                    <div class="flex flex-col items-end">
                      <span class="text-sm text-gray-300">{{ (perf.positionRatio || 0).toFixed(0) }}%</span>
                      <span class="text-xs" :class="getPositionLabel(perf.cashRatio).color">
                        {{ getPositionLabel(perf.cashRatio).label }}
                      </span>
                    </div>
                  </td>
                  <td class="py-4 px-4 text-right">
                    <span class="text-gray-300" v-if="perf.positionsCount > 0">{{ perf.positionsCount }}</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="py-4 px-4 text-right">
                    <span v-if="perf.tradesCount > 0" class="text-gray-300">
                      {{ perf.tradesCount }}
                      <span class="text-xs text-gray-400">({{ perf.buyCount }}/{{ perf.sellCount }})</span>
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="py-4 px-4 text-right">
                    <span v-if="perf.winRate !== null" class="text-gray-300">{{ perf.winRate?.toFixed(1) }}%</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 持仓分布统计 -->
        <div v-if="report.stockDistributions && report.stockDistributions.length > 0" class="mb-8">
          <h2 class="text-2xl font-bold text-cyber-green mb-4">🎯 持仓分布统计 (Day {{ report.day }}结束)</h2>
          
          <div class="cyber-card overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="border-b border-cyber-gray bg-cyber-light">
                  <th class="text-left py-4 px-4 text-sm text-gray-400">股票代码</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">持有AI数</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">总持股数</th>
                  <th class="text-right py-4 px-4 text-sm text-gray-400">总盈亏浮动</th>
                  <th class="text-left py-4 px-4 text-sm text-gray-400">主要持有者</th>
                  <th class="text-left py-4 px-4 text-sm text-gray-400">变化</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="dist in report.stockDistributions"
                  :key="dist.symbol"
                  class="border-b border-cyber-gray/50 hover:bg-cyber-light transition-colors"
                >
                  <!-- 股票代码 -->
                  <td class="py-4 px-4">
                    <span class="font-bold text-white">{{ dist.symbol }}</span>
                  </td>
                  <!-- 持有AI数 -->
                  <td class="py-4 px-4 text-right">
                    <span class="font-bold text-cyber-green">{{ dist.holdingAICount }}</span>
                  </td>
                  <!-- 总持股数 -->
                  <td class="py-4 px-4 text-right">
                    <span class="text-gray-300">{{ dist.totalShares }}股</span>
                  </td>
                  <!-- 总盈亏 -->
                  <td class="py-4 px-4 text-right">
                    <div class="flex items-center justify-end space-x-2">
                      <span
                        :class="dist.totalPnL >= 0 ? 'text-cyber-green' : 'text-cyber-red'"
                        class="font-bold"
                      >
                        {{ dist.totalPnL >= 0 ? '+' : '' }}${{ dist.totalPnL.toFixed(2) }}
                      </span>
                      <span v-if="dist.totalPnL > 0" class="text-cyber-green">✓</span>
                      <span v-else-if="dist.totalPnL < 0" class="text-cyber-red">✗</span>
                      <span v-else class="text-gray-400">●</span>
                    </div>
                  </td>
                  <!-- 主要持有者 -->
                  <td class="py-4 px-4">
                    <span class="text-sm text-gray-300">
                      <span v-for="(holder, idx) in dist.holders" :key="idx">
                        {{ holder.modelName }} ({{ holder.shares }})<span v-if="idx < dist.holders.length - 1">, </span>
                      </span>
                    </span>
                  </td>
                  <!-- 变化 -->
                  <td class="py-4 px-4">
                    <div v-if="dist.changes && dist.changes.length > 0" class="flex flex-wrap gap-2">
                      <span
                        v-for="(change, idx) in dist.changes"
                        :key="idx"
                        class="text-xs px-2 py-1 rounded"
                        :class="change.action === 'NEW' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'"
                      >
                        {{ change.action === 'NEW' ? '🆕' : '❌' }} {{ change.modelName }}{{ change.action === 'CLOSED' ? '清仓' : '' }}
                      </span>
                    </div>
                    <span v-else class="text-gray-400 text-sm">不变</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 关键发现 -->
          <div class="mt-6 cyber-card bg-cyber-light">
            <h3 class="text-lg font-bold text-gray-400 mb-3">关键发现</h3>
            <ul class="space-y-2">
              <li v-for="(insight, idx) in getStockInsights()" :key="idx" class="flex items-start">
                <span class="text-cyber-green mr-2">•</span>
                <span class="text-gray-300">{{ insight }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 每个模型的详细分析 -->
        <div class="space-y-6">
          <h2 class="text-2xl font-bold text-cyber-green mb-4">🔍 详细分析</h2>
          <div
            v-for="perf in report.modelPerformances"
            :key="perf.id"
            class="cyber-card"
          >
            <!-- 模型名称和绩效 -->
            <div class="border-b border-cyber-gray pb-4 mb-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-xl font-bold text-white">{{ perf.modelName }}</h3>
                <div class="flex items-center space-x-4">
                  <span class="text-2xl font-bold text-cyber-green">${{ perf.totalValue.toFixed(2) }}</span>
                  <span :class="perf.returnPct >= 0 ? 'text-cyber-green' : 'text-cyber-red'" class="text-xl font-bold">
                    {{ perf.returnPct >= 0 ? '+' : '' }}{{ perf.returnPct.toFixed(2) }}%
                  </span>
                </div>
              </div>
            </div>

            <!-- 持仓详情 -->
            <div v-if="perf.positionsDetail && perf.positionsDetail.length > 0" class="mb-4">
              <h4 class="text-sm font-bold text-gray-400 mb-2">当前持仓</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  v-for="pos in perf.positionsDetail"
                  :key="pos.symbol"
                  class="bg-cyber-light p-3 rounded border border-cyber-gray"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-white">{{ pos.symbol }}</span>
                    <span
                      :class="pos.unrealizedPnL >= 0 ? 'text-cyber-green' : 'text-cyber-red'"
                      class="text-sm font-medium"
                    >
                      {{ pos.unrealizedPnL >= 0 ? '+' : '' }}{{ pos.unrealizedPnLPct }}%
                    </span>
                  </div>
                  <div class="text-xs text-gray-400">
                    <div>数量: {{ pos.quantity }}</div>
                    <div>成本: ${{ pos.avgPrice.toFixed(2) }}</div>
                    <div>现价: ${{ pos.currentPrice.toFixed(2) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 当日交易记录 -->
            <div v-if="perf.todayTrades && perf.todayTrades.length > 0">
              <h4 class="text-sm font-bold text-gray-400 mb-3">📝 今日交易记录（{{ perf.todayTrades.length }} 笔）</h4>
              <div class="space-y-3">
                <div
                  v-for="trade in perf.todayTrades"
                  :key="trade.id"
                  class="bg-cyber-light p-3 rounded border"
                  :class="getBorderClass(trade, perf)"
                >
                  <!-- 交易信息 -->
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2 mb-1">
                        <span :class="trade.side === 'BUY' ? 'text-cyber-green' : 'text-cyber-red'" class="font-bold">
                          {{ trade.side === 'BUY' ? '📈 买入' : '📉 卖出' }}
                        </span>
                        <span class="text-white font-bold">{{ trade.symbol }}</span>
                        <!-- 最佳/最差标记 -->
                        <span v-if="trade.id === perf.todayBestTradeId" class="text-xs">🏆 最佳</span>
                        <span v-if="trade.id === perf.todayWorstTradeId" class="text-xs">📉 最差</span>
                      </div>
                      <div class="text-xs text-gray-400">
                        {{ trade.quantity }} 股 @ ${{ trade.price.toFixed(2) }}
                        <span v-if="trade.executedAt" class="ml-2">
                          {{ formatTime(trade.executedAt) }}
                        </span>
                      </div>
                    </div>
                    <!-- 盈亏显示 -->
                    <div class="text-right">
                      <div v-if="trade.pnl !== null" :class="(trade.pnl || 0) >= 0 ? 'text-cyber-green' : 'text-cyber-red'" class="font-bold">
                        {{ (trade.pnl || 0) >= 0 ? '+' : '' }}${{ Math.abs(trade.pnl || 0).toFixed(2) }}
                      </div>
                      <div v-if="trade.pnlPct !== null" :class="(trade.pnlPct || 0) >= 0 ? 'text-cyber-green' : 'text-cyber-red'" class="text-xs">
                        ({{ (trade.pnlPct || 0) >= 0 ? '+' : '' }}{{ (trade.pnlPct || 0).toFixed(2) }}%)
                      </div>
                      <div v-if="trade.status !== 'CLOSED'" class="text-xs text-gray-400">
                        {{ trade.status === 'PENDING' ? '待执行' : '持仓中' }}
                      </div>
                    </div>
                  </div>
                  <!-- 决策理由（折叠展开） -->
                  <div>
                    <button
                      @click="toggleRationale(trade.id)"
                      class="text-xs text-cyber-green hover:text-cyber-green/80 flex items-center space-x-1"
                    >
                      <span>{{ expandedTrades[trade.id] ? '▼' : '▶' }}</span>
                      <span>决策理由</span>
                    </button>
                    <div v-if="expandedTrades[trade.id]" class="mt-2 text-xs text-gray-300 bg-cyber-black/50 p-2 rounded">
                      {{ trade.rationale }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 暂无当日交易时的提示 -->
            <div v-else class="text-center py-4 text-gray-400 text-sm">
              💤 当日无交易，保持观望
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from '@/components/layout/Navbar.vue';

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: string;
}

interface Trade {
  symbol: string;
  side: string;
  pnl: number;
  rationale: string;
}

interface TodayTrade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  amount: number;
  pnl: number | null;
  pnlPct: number | null;
  rationale: string;
  status: string;
  executedAt: Date | null;
}

interface ModelPerformance {
  id: string;
  modelName: string;
  totalValue: number;
  returnAmount: number;
  returnPct: number;
  dailyReturn: number | null;
  dailyReturnPct: number | null;
  cashRatio: number;
  positionRatio: number;
  rankChange: number | null;
  positionsCount: number;
  positionsDetail: Position[];
  tradesCount: number;
  buyCount: number;
  sellCount: number;
  winRate: number | null;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  todayTrades: TodayTrade[];
  todayBestTradeId: string | null;
  todayWorstTradeId: string | null;
  strategyAnalysis: string;
  keyInsights: string[];
}

interface StockHolder {
  modelName: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
}

interface StockChange {
  modelName: string;
  action: 'NEW' | 'CLOSED';
}

interface StockDistribution {
  symbol: string;
  holdingAICount: number;
  totalShares: number;
  totalValue: number;
  totalPnL: number;
  holders: StockHolder[];
  changes: StockChange[];
}

interface ReportDetail {
  id: string;
  day: number;
  date: string;
  title: string;
  summary: string;
  overallInsight: string;
  modelPerformances: ModelPerformance[];
  stockDistributions: StockDistribution[];
}

const route = useRoute();
const report = ref<ReportDetail | null>(null);
const isLoading = ref(true);
const error = ref('');
const expandedTrades = ref<Record<string, boolean>>({});

async function fetchReportDetail() {
  try {
    isLoading.value = true;
    error.value = '';
    const reportId = route.params.id as string;
    const response = await fetch(`http://localhost:3000/api/reports/${reportId}`);
    
    if (!response.ok) {
      throw new Error('战报未找到');
    }
    
    report.value = await response.json();
  } catch (err: any) {
    error.value = err.message || '获取战报详情失败';
    console.error('Error fetching report detail:', err);
  } finally {
    isLoading.value = false;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 获取今日MVP
function getBestPerformer() {
  if (!report.value || report.value.modelPerformances.length === 0) {
    return { name: '-', return: '-' };
  }
  const best = report.value.modelPerformances.reduce((prev, curr) => 
    (curr.dailyReturnPct || 0) > (prev.dailyReturnPct || 0) ? curr : prev
  );
  return {
    name: best.modelName,
    return: `${(best.dailyReturnPct || 0) >= 0 ? '+' : ''}${(best.dailyReturnPct || 0).toFixed(2)}%`
  };
}

// 获取今日垫底
function getWorstPerformer() {
  if (!report.value || report.value.modelPerformances.length === 0) {
    return { name: '-', return: '-' };
  }
  const worst = report.value.modelPerformances.reduce((prev, curr) => 
    (curr.dailyReturnPct || 0) < (prev.dailyReturnPct || 0) ? curr : prev
  );
  return {
    name: worst.modelName,
    return: `${(worst.dailyReturnPct || 0) >= 0 ? '+' : ''}${(worst.dailyReturnPct || 0).toFixed(2)}%`
  };
}

// 计算平均收益
function getAverageReturn() {
  if (!report.value || report.value.modelPerformances.length === 0) {
    return 0;
  }
  const sum = report.value.modelPerformances.reduce((acc, perf) => acc + (perf.dailyReturnPct || 0), 0);
  return sum / report.value.modelPerformances.length;
}

// 获取交易最活跃
function getMostActive() {
  if (!report.value || report.value.modelPerformances.length === 0) {
    return { name: '-', trades: 0 };
  }
  const mostActive = report.value.modelPerformances.reduce((prev, curr) => 
    curr.tradesCount > prev.tradesCount ? curr : prev
  );
  return {
    name: mostActive.modelName,
    trades: mostActive.tradesCount
  };
}

// 根据现金比例返回仓位标签
function getPositionLabel(cashRatio: number) {
  if (cashRatio > 80) {
    return { label: '🛡️ 防守', color: 'text-blue-400' };
  } else if (cashRatio >= 50) {
    return { label: '⚖️ 平衡', color: 'text-gray-400' };
  } else if (cashRatio >= 20) {
    return { label: '⚖️ 平衡', color: 'text-gray-400' };
  } else if (cashRatio >= 0) {
    return { label: '🔥 激进', color: 'text-orange-400' };
  } else {
    return { label: '⚠️ 杠杆', color: 'text-red-400' };
  }
}

// 根据交易类型返回边框样式
function getBorderClass(trade: TodayTrade, perf: ModelPerformance) {
  if (trade.id === perf.todayBestTradeId) {
    return 'border-cyber-green/50';
  } else if (trade.id === perf.todayWorstTradeId) {
    return 'border-cyber-red/50';
  } else {
    return 'border-cyber-gray';
  }
}

// 切换交易理由的展开/折叠
function toggleRationale(tradeId: string) {
  expandedTrades.value[tradeId] = !expandedTrades.value[tradeId];
}

// 格式化时间
function formatTime(dateString: Date | string) {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 生成持仓分布的关键发现
function getStockInsights(): string[] {
  if (!report.value || !report.value.stockDistributions) {
    return [];
  }

  const insights: string[] = [];
  const distributions = report.value.stockDistributions;

  // 最大赢家
  const sortedByPnL = [...distributions].sort((a, b) => b.totalPnL - a.totalPnL);
  if (sortedByPnL.length > 0 && sortedByPnL[0].totalPnL > 0) {
    const winner = sortedByPnL[0];
    insights.push(
      `🏆 ${winner.symbol}成为最大赢家：${winner.holdingAICount}个AI持有，总浮盈${winner.totalPnL >= 0 ? '+' : ''}$${winner.totalPnL.toFixed(2)}`
    );
  }

  // 最大输家
  if (sortedByPnL.length > 0 && sortedByPnL[sortedByPnL.length - 1].totalPnL < 0) {
    const loser = sortedByPnL[sortedByPnL.length - 1];
    insights.push(
      `📉 ${loser.symbol}成为最大输家：${loser.holdingAICount}个AI持有，总浮亏$${loser.totalPnL.toFixed(2)}`
    );
  }

  // 抱团股票
  const topHolding = distributions.find(d => d.holdingAICount >= 4);
  if (topHolding) {
    insights.push(
      `🤝 ${topHolding.symbol}是"抱团股"：${topHolding.holdingAICount}个AI共同持有，总持股${topHolding.totalShares}股`
    );
  }

  // 新增持仓
  const newStocks = distributions.filter(d => d.changes.some(c => c.action === 'NEW'));
  if (newStocks.length > 0) {
    const symbols = newStocks.map(s => s.symbol).join('、');
    insights.push(`🆕 新增持仓：${symbols}`);
  }

  // 完全清仓
  const clearedStocks = distributions.filter(d => 
    d.holdingAICount === 0 && d.changes.some(c => c.action === 'CLOSED')
  );
  if (clearedStocks.length > 0) {
    const symbols = clearedStocks.map(s => s.symbol).join('、');
    insights.push(`❌ 完全清仓：${symbols}`);
  }

  // 部分清仓
  const partialCleared = distributions.filter(d => 
    d.holdingAICount > 0 && d.changes.some(c => c.action === 'CLOSED')
  );
  if (partialCleared.length > 0) {
    partialCleared.forEach(stock => {
      const cleared = stock.changes.filter(c => c.action === 'CLOSED').map(c => c.modelName).join('、');
      insights.push(`📤 ${stock.symbol}部分清仓：${cleared}退出，${stock.holdingAICount}个AI仍持有`);
    });
  }

  // 唯一持有（只有1个AI持有的股票）
  const uniqueHoldings = distributions.filter(d => d.holdingAICount === 1);
  if (uniqueHoldings.length > 0) {
    uniqueHoldings.forEach(stock => {
      insights.push(
        `🎯 ${stock.symbol}是"独门股"：仅${stock.holders[0].modelName}持有`
      );
    });
  }

  if (insights.length === 0) {
    insights.push('持仓分布保持稳定，各AI维持现有仓位');
  }

  return insights;
}

onMounted(() => {
  fetchReportDetail();
});
</script>

