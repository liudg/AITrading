# AI Trading System - 多模型对比交易系统

基于 [nof1.ai](https://nof1.ai) 的 AI 交易系统实现，采用多模型对比模式，包含完整的战报系统。

## 🎯 核心特性

### 策略实现
- ✅ **New Baseline Strategy**: 交易股票，整合新闻/情绪数据，反思式自我改进
- ✅ **多模型对比**: 4个AI模型（DeepSeek, Qwen, Claude, GPT-4）独立交易，完全隔离账户
- ✅ **反思机制**: T+N 天自动复盘，生成经验教训存入记忆库
- ✅ **AI 选股**: 用户可触发 AI 从市场中智能筛选股票池
- ✅ **每日战报**: 自动生成详细的交易战报，多维度分析模型表现

### 技术栈

#### 后端
- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **ORM**: Prisma (SQLite)
- **实时通信**: WebSocket (socket.io)
- **定时任务**: node-cron
- **API 调用**: axios

#### 前端
- **Framework**: Vue 3 (Composition API) + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router
- **样式**: Tailwind CSS
- **图表**: ECharts
- **实时通信**: socket.io-client

## 📁 项目结构

\`\`\`
AITrading/
├── server/                      # Node.js 后端
│   ├── src/
│   │   ├── adapters/           # 适配器层
│   │   │   ├── llm/            # LLM 提供商 (DeepSeek, Qwen)
│   │   │   │   ├── interface.ts
│   │   │   │   ├── deepseek.adapter.ts
│   │   │   │   └── qwen.adapter.ts
│   │   │   └── data/           # 数据提供商 (Market, News)
│   │   │       ├── interface.ts
│   │   │       ├── market.adapter.ts
│   │   │       └── news.adapter.ts
│   │   ├── services/           # 业务逻辑
│   │   │   ├── brain.service.ts       # AI 决策引擎
│   │   │   ├── reflection.service.ts  # 反思机制
│   │   │   ├── portfolio.service.ts   # 仓位管理
│   │   │   ├── report.service.ts      # 战报生成
│   │   │   └── stockpicker.service.ts # AI 选股
│   │   ├── cron/               # 定时任务
│   │   │   └── trading.cron.ts
│   │   ├── websocket/          # WebSocket 服务
│   │   │   └── server.ts
│   │   ├── routes/             # API 路由
│   │   │   └── index.ts
│   │   ├── utils/              # 工具函数
│   │   └── app.ts              # 应用入口
│   ├── prisma/
│   │   ├── schema.prisma       # 数据库模型
│   │   └── seed.ts             # 种子数据脚本
│   ├── scripts/                # 辅助脚本
│   │   ├── generate-test-report.ts  # 生成测试战报
│   │   ├── seed-history.ts          # 生成历史数据
│   │   └── verify-data.ts           # 数据验证
│   ├── package.json
│   └── tsconfig.json
│
├── client/                      # Vue 3 前端
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.vue
│   │   │   │   └── Sidebar.vue
│   │   │   ├── trading/
│   │   │   │   ├── ModelChat.vue
│   │   │   │   ├── TradesList.vue
│   │   │   │   ├── Positions.vue
│   │   │   │   └── CompDetails.vue
│   │   │   ├── charts/
│   │   │   │   └── PerformanceChart.vue
│   │   │   └── modals/
│   │   │       └── StockPicker.vue
│   │   ├── views/              # 页面
│   │   │   ├── Home.vue           # 排行榜主页
│   │   │   ├── Live.vue           # 实时交易
│   │   │   ├── Reports.vue        # 战报列表
│   │   │   └── ReportDetail.vue   # 战报详情
│   │   ├── stores/             # Pinia 状态管理
│   │   │   └── trading.store.ts
│   │   ├── composables/        # 组合式函数
│   │   │   └── useWebSocket.ts
│   │   ├── types/              # TypeScript 类型
│   │   ├── App.vue
│   │   └── main.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── 快速开始指南.md          # 安装运行指南
├── 项目总结.md              # 项目架构总结
├── 数据库设置说明.md        # 数据库文档
├── 测试数据脚本说明.md      # 测试工具文档
├── 战报功能说明.md          # 战报系统文档
├── 持仓分布功能说明.md      # 持仓分布功能
├── 当日交易展示功能说明.md  # 交易展示功能
└── README.md                # 项目说明（本文档）
\`\`\`

## 📖 文档导航

- **[快速开始指南](./快速开始指南.md)** - 完整的安装和运行教程
- **[项目总结](./项目总结.md)** - 项目架构和技术总结
- **[数据库设置说明](./数据库设置说明.md)** - 数据库结构和管理
- **[测试数据脚本说明](./测试数据脚本说明.md)** - 测试工具使用指南
- **[战报功能说明](./战报功能说明.md)** - 战报系统详细文档

## 🚀 快速开始

### 前置要求
- Node.js >= 18
- npm 或 yarn

**详细步骤请查看：[快速开始指南.md](./快速开始指南.md)**

### 安装

\`\`\`bash
# 安装后端依赖
cd server
npm install

# 初始化数据库
npx prisma migrate dev
npx prisma generate

# 安装前端依赖
cd ../client
npm install
\`\`\`

### 配置

在 \`server/.env\` 中配置 API Keys:

\`\`\`env
# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# Qwen API
QWEN_API_KEY=your_qwen_api_key
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

# Market Data API (可选，未配置则使用 Mock 数据)
MARKET_API_KEY=

# News API (可选，未配置则使用 Mock 数据)
NEWS_API_KEY=

# 应用配置
PORT=3000
DATABASE_URL="file:./dev.db"
\`\`\`

### 运行

\`\`\`bash
# 启动后端 (开发模式)
cd server
npm run dev

# 启动前端 (开发模式)
cd client
npm run dev
\`\`\`

访问 http://localhost:5173 查看应用。

## 📊 核心功能

### 1. AI 选股
- 用户输入筛选条件（如 "寻找最近一周新闻热度高的科技股"）
- AI 从市场中分析并推荐 10 只股票，附带推荐理由
- 用户可接受、调整或取消推荐

### 2. 多模型对比交易
- DeepSeek 和 Qwen 各自拥有独立的 $100,000 虚拟账户
- 每天盘前 9:00 AM (美东时间)，两个模型同时：
  - 获取股票池中所有标的的最新行情和新闻
  - 读取各自的历史 Reflection (经验教训)
  - 独立做出交易决策
  - 输出详细的 Rationale (决策理由)

### 3. 仓位管理
- AI 自主决定每只股票的仓位比例
- 硬性约束：单只股票 ≤ 20%，总仓位 ≤ 80%
- 保留至少 20% 现金用于风险控制

### 4. 反思机制
- 每笔交易执行后的 T+5 天自动触发复盘
- 系统将以下信息发送给 LLM：
  - 当时的决策理由 (Rationale)
  - 实际盈亏结果 (P&L)
  - 期间发生的市场事件
- LLM 生成"经验教训"，存入该模型的记忆库
- 下次决策时，相关经验会被检索并加入 Prompt

### 5. 实时展示
- WebSocket 推送交易状态更新
- 资产曲线对比图表
- 模型"思考过程"实时流式展示 (ModelChat)
- 持仓、已完成交易、策略详情等多维度数据

## 🎨 界面设计

参考 nof1.ai 的布局风格：
- 顶部导航：LIVE | LEADERBOARD | AI选股 | MODELS
- 策略切换：New Baseline | Monk Mode | ...
- 主图表区：双模型资产曲线对比
- 侧边栏：可折叠，展示 COMPLETED TRADES | MODELCHAT | POSITIONS | COMP DETAILS

## 📅 定时任务

系统包含三个自动定时任务：

### 1. 盘前分析 (默认 9:00 AM 美东时间)
1. 获取股票池中所有标的的最新数据
2. 并行触发所有AI模型（DeepSeek, Qwen, Claude, GPT-4）的决策流程
3. 生成交易计划并执行交易

### 2. 盘后反思 (默认 4:30 PM 美东时间)
1. 检查所有 T+5 天的已平仓交易
2. 触发 Reflection 流程
3. 将生成的经验教训存入数据库

### 3. 每日战报 (默认 5:00 PM 美东时间)
1. 统计当日所有模型的表现
2. 计算排名变化和持仓分布
3. 生成完整的每日战报
4. 推送WebSocket通知

**配置说明**: 可在 `.env` 文件中自定义定时任务时间，详见[快速开始指南](./快速开始指南.md)

## 🔧 开发进度

### 已完成 ✅
- [x] 项目架构设计
- [x] 后端基础框架搭建
- [x] Prisma Schema 实现（12张表）
- [x] LLM 适配器实现（DeepSeek + Qwen + Claude + GPT-4）
- [x] 数据适配器实现（Mock 版本）
- [x] 核心业务逻辑（Brain + Portfolio + Reflection + Report）
- [x] WebSocket 实时通信
- [x] 定时任务（交易 + 反思 + 战报）
- [x] 前端基础框架搭建
- [x] UI 布局实现（Cyberpunk风格）
- [x] AI 选股界面
- [x] 排行榜页面
- [x] 战报列表页面
- [x] 战报详情页面（仪表盘风格）
- [x] 侧边栏详情面板
- [x] 前后端集成测试
- [x] 测试数据脚本工具
- [x] 完整文档系统

### 可选增强 🔄
- [ ] 资产曲线图表（ECharts集成）
- [ ] AI文字总结（LLM生成战报总结）
- [ ] 数据导出功能（PDF/CSV）
- [ ] 真实API接入（Yahoo Finance / News API）
- [ ] 更多交易策略（Monk Mode / Situational Awareness）

**项目完成度**: 约 95%（核心功能全部完成）

## 🎉 项目亮点

1. **完整的战报系统**
   - 仪表盘风格设计，信息层次清晰
   - 多维度视角（模型维度 + 股票维度）
   - 决策透明化，展示AI原始理由
   - 自动化洞察生成

2. **真正的反思机制**
   - AI自我学习和持续改进
   - 经验教训存入记忆库
   - 避免重复犯错

3. **多模型公平对比**
   - 4个主流LLM同台竞技
   - 完全独立的账户
   - 清晰的性能对比

4. **生产级架构**
   - 清晰的分层设计
   - TypeScript全栈类型安全
   - 易于扩展和维护

5. **完善的文档和工具**
   - 详细的中文文档
   - 测试数据生成工具
   - 数据验证工具

## 📄 许可证

MIT

