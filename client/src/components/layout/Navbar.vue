<template>
  <nav class="cyber-border border-b border-cyber-gray bg-cyber-black sticky top-0 z-50">
    <div class="max-w-full px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center space-x-8">
          <router-link to="/" class="text-2xl font-bold text-cyber-green hover:cyber-glow transition-all">
            AI 交易竞技场
          </router-link>

          <!-- Navigation Links -->
          <div class="hidden md:flex space-x-6">
            <router-link
              to="/"
              class="text-sm hover:text-cyber-green transition-colors"
              active-class="text-cyber-green"
            >
              实时
            </router-link>
            <router-link
              to="/leaderboard"
              class="text-sm hover:text-cyber-green transition-colors"
              active-class="text-cyber-green"
            >
              排行榜
            </router-link>
            <router-link
              to="/reports"
              class="text-sm hover:text-cyber-green transition-colors"
              active-class="text-cyber-green"
            >
              战报
            </router-link>
            <router-link
              to="/ai-picker"
              class="text-sm hover:text-cyber-green transition-colors"
              active-class="text-cyber-green"
            >
              AI选股
            </router-link>
          </div>
        </div>

        <!-- Right Actions -->
        <div class="flex items-center space-x-4">
          <!-- Market Status -->
          <div class="flex items-center space-x-2 px-3 py-1.5 rounded bg-cyber-light border border-cyber-gray">
            <div :class="['w-2 h-2 rounded-full', marketStatus.isOpen ? 'bg-cyber-green pulse-green' : 'bg-cyber-red']" />
            <span class="text-xs text-gray-300">
              {{ marketStatus.isOpen ? '美股开市' : '美股休市' }}
            </span>
            <span class="text-xs text-gray-500">· {{ marketStatus.message }}</span>
          </div>

          <!-- Connection Status -->
          <div class="flex items-center space-x-2 text-xs">
            <div :class="['w-2 h-2 rounded-full', connected ? 'bg-cyber-green pulse-green' : 'bg-cyber-red']" />
            <span class="text-gray-400">{{ connected ? '已连接' : '未连接' }}</span>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useWebSocket } from '@/composables/useWebSocket';

const { connected } = useWebSocket();

interface MarketStatus {
  isOpen: boolean;
  message: string;
}

const marketStatus = ref<MarketStatus>({
  isOpen: false,
  message: '',
});

let statusInterval: number | null = null;

// 计算美股市场状态（使用北京时间显示）
function calculateMarketStatus(): MarketStatus {
  const now = new Date();
  
  // 判断是否夏令时
  const isDST = isDaylightSavingTime(now);
  
  // 美股交易时间（美东时间）：09:30 - 16:00
  // 转换为北京时间：
  // 冬令时（EST, UTC-5）：22:30 - 次日05:00
  // 夏令时（EDT, UTC-4）：21:30 - 次日04:00
  const marketOpenHour = isDST ? 21 : 22;
  const marketOpenMinute = 30;
  const marketCloseHour = isDST ? 4 : 5;
  const marketCloseMinute = 0;
  
  // 获取北京时间
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcDay = now.getUTCDay();
  const utcDate = now.getUTCDate();
  const utcMonth = now.getUTCMonth();
  
  // 转换为北京时间 (UTC+8)
  let bjHours = utcHours + 8;
  let bjDay = utcDay;
  let bjDate = utcDate;
  let bjMonth = utcMonth;
  
  // 处理跨天
  if (bjHours >= 24) {
    bjHours -= 24;
    bjDate += 1;
    bjDay = (bjDay + 1) % 7;
  }
  
  const currentMinutes = bjHours * 60 + utcMinutes;
  
  // 周末判断（周六、周日休市）
  if (bjDay === 0 || bjDay === 6) {
    // 计算下周一开盘时间
    const daysUntilMonday = bjDay === 0 ? 1 : 2;
    const nextOpenDate = bjDate + daysUntilMonday;
    const nextOpenMonth = bjMonth + 1;
    
    return {
      isOpen: false,
      message: `开盘时间：${nextOpenMonth.toString().padStart(2, '0')}/${nextOpenDate.toString().padStart(2, '0')} ${marketOpenHour.toString().padStart(2, '0')}:${marketOpenMinute.toString().padStart(2, '0')}`,
    };
  }
  
  // 判断是否在交易时间内
  // 注意：收盘时间是次日凌晨，需要特殊处理
  const marketOpenMinutes = marketOpenHour * 60 + marketOpenMinute;
  const marketCloseMinutes = marketCloseHour * 60 + marketCloseMinute;
  
  // 开市时间段：22:30-23:59（当天晚上）或 00:00-05:00（次日凌晨）
  const isInTradingHours = 
    (currentMinutes >= marketOpenMinutes) || // 晚上22:30之后
    (currentMinutes < marketCloseMinutes);   // 凌晨05:00之前
  
  if (isInTradingHours) {
    // 开市中，显示收盘时间
    let closeDate = bjDate;
    let closeMonth = bjMonth;
    
    // 如果当前时间>=22:30，收盘时间是明天
    if (bjHours >= marketOpenHour) {
      closeDate += 1;
    }
    
    return {
      isOpen: true,
      message: `收盘时间：${(closeMonth + 1).toString().padStart(2, '0')}/${closeDate.toString().padStart(2, '0')} ${marketCloseHour.toString().padStart(2, '0')}:${marketCloseMinute.toString().padStart(2, '0')}`,
    };
  } else {
    // 休市中，显示开盘时间（今天晚上22:30）
    return {
      isOpen: false,
      message: `开盘时间：${(bjMonth + 1).toString().padStart(2, '0')}/${bjDate.toString().padStart(2, '0')} ${marketOpenHour.toString().padStart(2, '0')}:${marketOpenMinute.toString().padStart(2, '0')}`,
    };
  }
}

// 判断是否夏令时（Daylight Saving Time）
function isDaylightSavingTime(date: Date): boolean {
  // 夏令时：3月第二个周日凌晨2点 到 11月第一个周日凌晨2点
  const year = date.getUTCFullYear();
  
  // 计算3月第二个周日
  const marchFirst = new Date(Date.UTC(year, 2, 1));
  const marchFirstDay = marchFirst.getUTCDay();
  const daysToFirstSunday = marchFirstDay === 0 ? 0 : 7 - marchFirstDay;
  const marchSecondSundayDate = 1 + daysToFirstSunday + 7;
  const marchSecondSunday = new Date(Date.UTC(year, 2, marchSecondSundayDate, 2, 0, 0));
  
  // 计算11月第一个周日
  const novemberFirst = new Date(Date.UTC(year, 10, 1));
  const novemberFirstDay = novemberFirst.getUTCDay();
  const daysToNovemberSunday = novemberFirstDay === 0 ? 0 : 7 - novemberFirstDay;
  const novemberFirstSundayDate = 1 + daysToNovemberSunday;
  const novemberFirstSunday = new Date(Date.UTC(year, 10, novemberFirstSundayDate, 2, 0, 0));
  
  return date >= marchSecondSunday && date < novemberFirstSunday;
}

// 更新市场状态
function updateMarketStatus() {
  marketStatus.value = calculateMarketStatus();
}

onMounted(() => {
  updateMarketStatus();
  // 每分钟更新一次
  statusInterval = window.setInterval(updateMarketStatus, 60000);
});

onUnmounted(() => {
  if (statusInterval) {
    clearInterval(statusInterval);
  }
});
</script>

