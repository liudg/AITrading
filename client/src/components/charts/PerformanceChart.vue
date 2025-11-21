<template>
  <div class="w-full h-full">
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-gray-400">加载中...</div>
    </div>
    <div v-else-if="error" class="flex items-center justify-center h-full">
      <div class="text-cyber-red">{{ error }}</div>
    </div>
    <v-chart v-else ref="chartRef" :option="chartOption" :autoresize="true" class="w-full h-full" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import axios from 'axios';

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

interface Props {
  modelIds: string[];
  timeRange?: number; // 小时数
  viewMode?: 'value' | 'percent'; // 显示模式：绝对值或百分比
}

const props = withDefaults(defineProps<Props>(), {
  timeRange: 72,
  viewMode: 'value',
});

interface HistoryData {
  timestamp: string;
  totalValue: number;
  returnPct: number;
}

interface ModelHistory {
  modelId: string;
  modelName: string;
  data: HistoryData[];
}

const chartRef = ref();
const loading = ref(true);
const error = ref<string | null>(null);
const historiesData = ref<ModelHistory[]>([]);

// 颜色配置
const colors = ['#00ff9f', '#00d4ff', '#ff00ff', '#ffaa00'];

// 获取历史数据
const fetchHistories = async () => {
  try {
    loading.value = true;
    error.value = null;

    const promises = props.modelIds.map(async (modelId, index) => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/portfolio/${modelId}/history?hours=${props.timeRange}`
        );
        
        // 获取模型名称
        const modelResponse = await axios.get(`http://localhost:3000/api/models`);
        const model = modelResponse.data.find((m: any) => m.id === modelId);

        return {
          modelId,
          modelName: model?.displayName || `模型 ${index + 1}`,
          data: response.data,
        };
      } catch (err) {
        console.error(`获取模型 ${modelId} 历史数据失败:`, err);
        return null;
      }
    });

    const results = await Promise.all(promises);
    historiesData.value = results.filter((r) => r !== null) as ModelHistory[];

    if (historiesData.value.length === 0) {
      error.value = '暂无历史数据';
    }
  } catch (err: any) {
    error.value = err.message || '加载数据失败';
  } finally {
    loading.value = false;
  }
};

// 图表配置
const chartOption = computed(() => {
  if (historiesData.value.length === 0) {
    return {};
  }

  // 准备数据
  const series = historiesData.value.map((history, index) => ({
    name: history.modelName,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: {
      width: 2,
      color: colors[index % colors.length],
    },
    itemStyle: {
      color: colors[index % colors.length],
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: colors[index % colors.length] + '40' },
          { offset: 1, color: colors[index % colors.length] + '00' },
        ],
      },
    },
    data: history.data.map((d) => [
      new Date(d.timestamp).getTime(),
      props.viewMode === 'percent' ? d.returnPct : d.totalValue,
    ]),
  }));

  return {
    backgroundColor: 'transparent',
    title: {
      text: props.viewMode === 'percent' ? '收益率对比 (%)' : '资产净值对比 ($)',
      left: 'center',
      top: 10,
      textStyle: {
        color: '#00ff9f',
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#00ff9f',
      borderWidth: 1,
      textStyle: {
        color: '#e2e8f0',
      },
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#00ff9f',
        },
      },
      formatter: (params: any) => {
        if (!params || params.length === 0) return '';
        
        const date = new Date(params[0].value[0]);
        let html = `<div style="padding: 5px;">`;
        html += `<div style="margin-bottom: 8px; color: #00ff9f; font-weight: bold;">${date.toLocaleString('zh-CN')}</div>`;
        
        params.forEach((param: any) => {
          const value = param.value[1];
          const formattedValue = props.viewMode === 'percent' 
            ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
            : `$${value.toFixed(2)}`;
          
          html += `<div style="margin: 4px 0;">`;
          html += `<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>`;
          html += `<span style="color: #cbd5e1;">${param.seriesName}:</span> `;
          html += `<span style="color: ${value >= 0 ? '#00ff9f' : '#ff0055'}; font-weight: bold; margin-left: 8px;">${formattedValue}</span>`;
          html += `</div>`;
        });
        
        html += `</div>`;
        return html;
      },
    },
    legend: {
      data: historiesData.value.map((h) => h.modelName),
      top: 40,
      textStyle: {
        color: '#94a3b8',
      },
      itemStyle: {
        borderWidth: 0,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 80,
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#334155',
        },
      },
      axisLabel: {
        color: '#64748b',
        formatter: (value: number) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#1e293b',
          type: 'dashed',
        },
      },
    },
    yAxis: {
      type: 'value',
      scale: true, // 自动根据数据范围调整，不从0开始
      splitNumber: 5, // 分割段数
      min: (value: any) => {
        // 最小值向下取整，留出一些空间
        return Math.floor(value.min * 0.95);
      },
      max: (value: any) => {
        // 最大值向上取整，留出一些空间 
        return Math.ceil(value.max * 1.05);
      },
      axisLine: {
        lineStyle: {
          color: '#334155',
        },
      },
      axisLabel: {
        color: '#64748b',
        formatter: (value: number) => {
          if (props.viewMode === 'percent') {
            return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
          }
          return `$${(value / 1000).toFixed(0)}K`;
        },
      },
      splitLine: {
        lineStyle: {
          color: '#1e293b',
          type: 'dashed',
        },
      },
    },
    series,
  };
});

// 监听属性变化
watch(
  () => [props.modelIds, props.timeRange, props.viewMode],
  (newVal, oldVal) => {
    // 只有在实际值变化时才重新加载
    const [newIds, newRange, newMode] = newVal;
    const [oldIds, oldRange, oldMode] = oldVal || [[], 0, ''];
    
    // 检查modelIds是否真的变化（内容比较，而不是引用比较）
    const idsChanged = !oldIds || newIds.length !== oldIds.length || 
                       newIds.some((id, idx) => id !== oldIds[idx]);
    
    if (idsChanged || newRange !== oldRange || newMode !== oldMode) {
      fetchHistories();
    }
  },
  { deep: false } // 不需要deep watch，我们自己比较
);

onMounted(() => {
  fetchHistories();
});
</script>

<style scoped>
/* ECharts 容器样式 */
</style>

