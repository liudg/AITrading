<template>
  <div class="min-h-screen bg-cyber-black">
    <Navbar />

    <div class="max-w-7xl mx-auto px-6 py-12">
      <!-- 标题 -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-cyber-green mb-2">AI交易战报</h1>
        <p class="text-gray-400">6大AI模型股票交易实验每日战报</p>
      </div>

      <!-- 生成战报按钮 -->
      <div class="mb-6 flex justify-end">
        <button
          @click="generateReport"
          :disabled="isGenerating"
          class="px-4 py-2 bg-cyber-green text-cyber-black font-bold rounded hover:bg-cyber-green/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isGenerating ? '生成中...' : '生成今日战报' }}
        </button>
      </div>

      <!-- 战报列表 -->
      <div v-if="isLoading" class="cyber-card p-8 text-center text-gray-400">
        加载中...
      </div>

      <div v-else-if="error" class="cyber-card p-8 text-center text-cyber-red">
        {{ error }}
      </div>

      <div v-else-if="reports.length === 0" class="cyber-card p-8 text-center text-gray-400">
        暂无战报数据
      </div>

      <div v-else class="cyber-card overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-cyber-gray">
              <th class="text-left py-4 px-6 text-sm text-gray-400">Day</th>
              <th class="text-left py-4 px-6 text-sm text-gray-400">日期</th>
              <th class="text-left py-4 px-6 text-sm text-gray-400">标题</th>
              <th class="text-right py-4 px-6 text-sm text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="report in reports"
              :key="report.id"
              class="border-b border-cyber-gray/50 hover:bg-cyber-light transition-colors"
            >
              <td class="py-4 px-6">
                <span class="font-bold text-cyber-green">D{{ report.day }}</span>
              </td>
              <td class="py-4 px-6">
                <span class="text-gray-300">{{ formatDate(report.date) }}</span>
              </td>
              <td class="py-4 px-6">
                <div>
                  <div class="font-medium text-white">{{ report.title }}</div>
                  <div v-if="report.summary" class="text-sm text-gray-400 mt-1">
                    {{ report.summary }}
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-right">
                <router-link
                  :to="`/reports/${report.id}`"
                  class="text-cyber-green hover:text-cyber-green/80 font-medium"
                >
                  查看详情
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '@/components/layout/Navbar.vue';

interface Report {
  id: string;
  day: number;
  date: string;
  title: string;
  summary?: string;
}

const router = useRouter();
const reports = ref<Report[]>([]);
const isLoading = ref(true);
const isGenerating = ref(false);
const error = ref('');

// 获取战报列表
async function fetchReports() {
  try {
    isLoading.value = true;
    error.value = '';
    const response = await fetch('http://localhost:3000/api/reports');
    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }
    reports.value = await response.json();
  } catch (err: any) {
    error.value = err.message || '获取战报列表失败';
    console.error('Error fetching reports:', err);
  } finally {
    isLoading.value = false;
  }
}

// 生成战报
async function generateReport() {
  try {
    isGenerating.value = true;
    const response = await fetch('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate report');
    }
    
    const result = await response.json();
    
    // 重新加载列表
    await fetchReports();
    
    // 跳转到新生成的战报
    if (result.reportId) {
      router.push(`/reports/${result.reportId}`);
    }
  } catch (err: any) {
    error.value = err.message || '生成战报失败';
    console.error('Error generating report:', err);
  } finally {
    isGenerating.value = false;
  }
}

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

onMounted(() => {
  fetchReports();
});
</script>

