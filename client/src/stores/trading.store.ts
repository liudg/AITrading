// Trading 状态管理

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import type { Model, Portfolio, Trade, Reflection, StockRecommendation, SingleStockAnalysis } from '@/types';

const API_BASE = '/api';

export const useTradingStore = defineStore('trading', () => {
  // State
  const models = ref<Model[]>([]);
  const portfolios = ref<Record<string, Portfolio>>({});
  const trades = ref<Trade[]>([]);
  const reflections = ref<Reflection[]>([]);
  const stockPool = ref<string[]>([]);
  const selectedModelId = ref<string | null>(null);
  const loading = ref(false);

  // Computed
  const selectedModel = computed(() => {
    if (!selectedModelId.value) return null;
    return models.value.find((m) => m.id === selectedModelId.value);
  });

  const selectedPortfolio = computed(() => {
    if (!selectedModelId.value) return null;
    return portfolios.value[selectedModelId.value];
  });

  // Actions
  async function fetchModels() {
    try {
      const response = await axios.get(`${API_BASE}/models`);
      models.value = response.data;
      
      // 默认选中第一个模型
      if (models.value.length > 0 && !selectedModelId.value) {
        selectedModelId.value = models.value[0].id;
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  }

  async function fetchPortfolio(modelId: string) {
    try {
      const response = await axios.get(`${API_BASE}/portfolio/${modelId}`);
      portfolios.value[modelId] = response.data;
    } catch (error) {
      console.error(`Failed to fetch portfolio for ${modelId}:`, error);
    }
  }

  async function fetchAllPortfolios() {
    for (const model of models.value) {
      await fetchPortfolio(model.id);
    }
  }

  async function fetchTrades(modelId?: string, limit: number = 50) {
    try {
      const params: any = { limit };
      if (modelId) params.modelId = modelId;

      const response = await axios.get(`${API_BASE}/trades`, { params });
      trades.value = response.data;
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    }
  }

  async function fetchReflections(modelId?: string, limit: number = 20) {
    try {
      const params: any = { limit };
      if (modelId) params.modelId = modelId;

      const response = await axios.get(`${API_BASE}/reflections`, { params });
      reflections.value = response.data;
    } catch (error) {
      console.error('Failed to fetch reflections:', error);
    }
  }

  async function fetchStockPool() {
    try {
      const response = await axios.get(`${API_BASE}/stock-pool`);
      stockPool.value = response.data.symbols;
    } catch (error) {
      console.error('Failed to fetch stock pool:', error);
    }
  }

  async function pickStocks(criteria: string, maxResults: number = 10): Promise<StockRecommendation[]> {
    try {
      loading.value = true;
      const response = await axios.post(`${API_BASE}/stock-picker`, {
        criteria,
        maxResults,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to pick stocks:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function saveStockPool(symbols: string[], name: string, reason?: string) {
    try {
      loading.value = true;
      await axios.post(`${API_BASE}/stock-pool`, {
        symbols,
        name,
        createdBy: 'AI',
        reason,
      });
      await fetchStockPool();
    } catch (error) {
      console.error('Failed to save stock pool:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function analyzeSingleStock(symbol: string, criteria?: string): Promise<SingleStockAnalysis> {
    try {
      loading.value = true;
      const response = await axios.post(`${API_BASE}/stock-analysis`, {
        symbol,
        criteria,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze stock:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function updatePortfolio(modelId: string, portfolio: Portfolio) {
    portfolios.value[modelId] = portfolio;
  }

  function addTrade(trade: Trade) {
    trades.value.unshift(trade);
  }

  function addReflection(reflection: Reflection) {
    reflections.value.unshift(reflection);
  }

  // 初始化
  async function initialize() {
    await fetchModels();
    await fetchStockPool();
    await fetchAllPortfolios();
    await fetchTrades();
    await fetchReflections();
  }

  return {
    // State
    models,
    portfolios,
    trades,
    reflections,
    stockPool,
    selectedModelId,
    loading,

    // Computed
    selectedModel,
    selectedPortfolio,

    // Actions
    fetchModels,
    fetchPortfolio,
    fetchAllPortfolios,
    fetchTrades,
    fetchReflections,
    fetchStockPool,
    pickStocks,
    saveStockPool,
    analyzeSingleStock,
    updatePortfolio,
    addTrade,
    addReflection,
    initialize,
  };
});

