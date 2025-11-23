# 环境变量配置说明

本文档说明了 AI Trading System 所需的所有环境变量配置。

## 📋 配置文件

在 `server` 目录下创建 `.env` 文件，包含以下环境变量：

## 🔧 基础配置

```bash
# 服务器端口
PORT=3000

# Node 环境 (development | production)
NODE_ENV=development

# 日志级别 (debug | info | warn | error)
LOG_LEVEL=info
```

## 🤖 DeepSeek LLM 配置

```bash
# DeepSeek API 密钥
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# DeepSeek API 地址
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# DeepSeek 模型 ID
DEEPSEEK_MODEL=deepseek-chat
```

## 🤖 Qwen (通义千问) LLM 配置

```bash
# Qwen API 密钥
QWEN_API_KEY=your_qwen_api_key_here

# Qwen API 地址（兼容 OpenAI 格式）
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# Qwen 模型 ID (qwen3-max | qwen-plus | qwen-turbo)
QWEN_MODEL=qwen3-max
```

## ⚙️ LLM 参数配置（可选）

这些参数用于控制 AI 模型的行为：

```bash
# 市场分析的 Temperature (0-2，越高输出越随机)
LLM_TEMPERATURE_ANALYSIS=0.7

# 市场分析的最大 Token 数
LLM_MAX_TOKENS_ANALYSIS=4000

# 交易反思的 Temperature
LLM_TEMPERATURE_REFLECTION=0.8

# 交易反思的最大 Token 数
LLM_MAX_TOKENS_REFLECTION=1000

# AI 选股的 Temperature
LLM_TEMPERATURE_PICKER=0.7

# AI 选股的最大 Token 数
LLM_MAX_TOKENS_PICKER=2000
```

### Temperature 说明

- **0.0-0.3**: 非常确定性，输出稳定
- **0.4-0.7**: 平衡创造性和稳定性（推荐）
- **0.8-1.0**: 更具创造性和随机性
- **1.0+**: 高度随机（不推荐用于交易）

## 💼 交易策略配置（可选）

```bash
# 初始资金（美元）
INITIAL_CAPITAL=100000

# 单只股票最大持仓比例 (0-1)
MAX_POSITION_SIZE=0.2

# 总持仓最大比例 (0-1)
MAX_TOTAL_POSITION=0.8

# 默认股票池（逗号分隔的股票代码）
# 当数据库中没有活跃股票池时使用
DEFAULT_STOCK_POOL=NVDA,TSLA,AAPL,MSFT,GOOGL,META,AMZN,AMD,NFLX,BABA
```

## ⏰ 定时任务配置（可选）

使用 Cron 表达式配置定时任务：

```bash
# 盘前分析定时任务
# 默认：每周一到周五上午9点
PREMARKET_ANALYSIS_CRON=0 9 * * 1-5

# 盘后反思定时任务
# 默认：每周一到周五下午4点30分
POSTMARKET_REFLECTION_CRON=30 16 * * 1-5

# 每日报告生成定时任务
# 默认：每周一到周五下午5点
DAILY_REPORT_CRON=0 17 * * 1-5

# 反思回顾天数
REFLECTION_DAYS=5
```

### Cron 表达式说明

格式：`分 时 日 月 周`

示例：

- `0 9 * * 1-5`: 每周一到周五上午 9 点
- `30 16 * * *`: 每天下午 4 点 30 分
- `0 */2 * * *`: 每 2 小时执行一次

## 🗄️ 数据库配置

```bash
# Prisma 数据库连接（SQLite）
DATABASE_URL=file:./prisma/dev.db
```

## 📝 完整配置示例

创建 `server/.env` 文件，内容如下：

```bash
# 基础配置
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# DeepSeek
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Qwen
QWEN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3-max

# LLM 参数
LLM_TEMPERATURE_ANALYSIS=0.7
LLM_MAX_TOKENS_ANALYSIS=4000
LLM_TEMPERATURE_REFLECTION=0.8
LLM_MAX_TOKENS_REFLECTION=1000
LLM_TEMPERATURE_PICKER=0.7
LLM_MAX_TOKENS_PICKER=2000

# 交易策略
INITIAL_CAPITAL=100000
MAX_POSITION_SIZE=0.2
MAX_TOTAL_POSITION=0.8
DEFAULT_STOCK_POOL=NVDA,TSLA,AAPL,MSFT,GOOGL,META,AMZN,AMD,NFLX,BABA

# 定时任务
PREMARKET_ANALYSIS_CRON=0 9 * * 1-5
POSTMARKET_REFLECTION_CRON=30 16 * * 1-5
DAILY_REPORT_CRON=0 17 * * 1-5
REFLECTION_DAYS=5

# 数据库
DATABASE_URL=file:./prisma/dev.db
```

## 🔐 安全提示

- **不要将 `.env` 文件提交到 Git**（已在 `.gitignore` 中配置）
- **API 密钥需要妥善保管**，避免泄露
- 生产环境建议使用更安全的密钥管理方案

## 🚀 快速开始

1. 复制配置示例：

   ```bash
   cd server
   # 手动创建 .env 文件并填入配置
   ```

2. 获取 API 密钥：

   - DeepSeek: https://platform.deepseek.com/
   - Qwen: https://dashscope.aliyun.com/

3. 启动服务：
   ```bash
   npm run dev
   ```

## 📚 相关文档

- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [Qwen API 文档](https://help.aliyun.com/zh/dashscope/)
- [OpenAI API 兼容性说明](https://platform.openai.com/docs/api-reference)
