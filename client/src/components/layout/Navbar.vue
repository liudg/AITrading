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
  // 1. 获取当前时间 (服务器已经是北京时间，直接用)
  const now = new Date();

  // 2. 判断是否夏令时 (美股规则：3月第2个周日 到 11月第1个周日)
  const isDst = checkIsDst(now);

  // 3. 根据夏令时设定北京时间的阈值
  // 夏令时: 21:30 开盘, 次日 04:00 收盘
  // 冬令时: 22:30 开盘, 次日 05:00 收盘
  const openHour = isDst ? 21 : 22;
  const openMinute = 30;
  const closeHour = isDst ? 4 : 5;
  
  const openThreshold = openHour * 60 + openMinute; // 晚间开盘分钟数
  const closeThreshold = closeHour * 60;            // 凌晨收盘分钟数

  // 4. 核心逻辑：判断当前是否在交易时段
  // 美股时段拆解为北京时间：
  // A段 (凌晨): 周二至周六的 00:00 ~ 04:00/05:00
  // B段 (晚间): 周一至周五的 21:30/22:30 ~ 23:59

  const dayOfWeek = now.getDay(); // 0(Sun) - 6(Sat)
  // 转换为“当天的分钟数”用于比较 (例如 10:30 = 630)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isMorningSession = (dayOfWeek >= 2 && dayOfWeek <= 6) && (currentMinutes < closeThreshold);
  const isEveningSession = (dayOfWeek >= 1 && dayOfWeek <= 5) && (currentMinutes >= openThreshold);

  // --- 场景 1: 正在交易中 ---
  if (isMorningSession) {
    // 凌晨时段：收盘时间是今天 (例如今天凌晨 04:00)
    const closeTime = new Date(now);
    closeTime.setHours(closeHour, 0, 0, 0);
    return { isOpen: true, message: `收盘时间：${formatDate(closeTime)}` };
  }

  if (isEveningSession) {
    // 晚间时段：收盘时间是明天凌晨
    const closeTime = new Date(now);
    closeTime.setDate(closeTime.getDate() + 1); // +1天
    closeTime.setHours(closeHour, 0, 0, 0);
    return { isOpen: true, message: `收盘时间：${formatDate(closeTime)}` };
  }

  // --- 场景 2: 休市中 (计算下次开盘) ---
  let targetDate = new Date(now);
  targetDate.setHours(openHour, openMinute, 0, 0);

  if (dayOfWeek === 6) {
    // 周六：下次开盘是下周一 (今天+2天)
    targetDate.setDate(targetDate.getDate() + 2);
  } 
  else if (dayOfWeek === 0) {
    // 周日：下次开盘是下周一 (今天+1天)
    targetDate.setDate(targetDate.getDate() + 1);
  } 
  else {
    // 周一到周五
    if (currentMinutes >= openThreshold) {
      // 理论上不会进这里，因为上面 isEveningSession 已经拦截了
      // 这里作为兜底，如果万一过了时间点算作明天
      targetDate.setDate(targetDate.getDate() + 1);
    } else {
      // 如果还没到今天的开盘时间 (例如周一中午 12:00)
      // 目标就是今天的 21:30，不做日期变更
      // 注意：如果是周二到周五的凌晨收盘后(比如 06:00)，也属于“还没到今晚开盘”，逻辑一致
    }
  }

  return { isOpen: false, message: `开盘时间：${formatDate(targetDate)}` };
}

/**
 * 使用 Intl 判断美东时间是否为夏令时
 * 返回 true (EDT/夏令时) 或 false (EST/冬令时)
 */
 function checkIsDst(date: Date): boolean {
  // 使用 en-US locale 和 America/New_York 时区
  // timeZoneName: 'short' 会返回 "EST" 或 "EDT"
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(date);
  const tzPart = parts.find(p => p.type === 'timeZoneName');
  
  // EDT = Eastern Daylight Time (夏令时)
  return tzPart?.value === 'EDT';
}

// 简单格式化 (服务器已是北京时间，直接输出)
function formatDate(date: Date): string {
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${m}/${d} ${h}:${min}`;
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

