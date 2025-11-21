import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Live from '@/views/Live.vue'
import Leaderboard from '@/views/Leaderboard.vue'
import AIStockPicker from '@/views/AIStockPicker.vue'
import Reports from '@/views/Reports.vue'
import ReportDetail from '@/views/ReportDetail.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Live',
    component: Live,
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: Leaderboard,
  },
  {
    path: '/ai-picker',
    name: 'AIStockPicker',
    component: AIStockPicker,
  },
  {
    path: '/reports',
    name: 'Reports',
    component: Reports,
  },
  {
    path: '/reports/:id',
    name: 'ReportDetail',
    component: ReportDetail,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router

