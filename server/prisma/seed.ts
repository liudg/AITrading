// 数据库种子数据脚本

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("开始清理数据库...");

  // 清理现有数据（按依赖关系倒序删除）
  await prisma.portfolioSnapshot.deleteMany();
  await prisma.reflection.deleteMany();
  await prisma.reportStockDistribution.deleteMany();
  await prisma.reportModelPerformance.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.position.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.model.deleteMany();
  await prisma.stockPool.deleteMany();
  await prisma.marketData.deleteMany();
  await prisma.newsData.deleteMany();
  await prisma.systemConfig.deleteMany();

  console.log("数据库已清理完成");
  console.log("开始插入测试数据...");

  // 1. 创建 AI 模型
  console.log("创建 AI 模型...");
  const deepseek = await prisma.model.create({
    data: {
      name: "DeepSeek-V3",
      displayName: "DeepSeek V3",
      apiConfig: JSON.stringify({
        apiKey: process.env.DEEPSEEK_API_KEY || "test-key",
        apiUrl: "https://api.deepseek.com",
        modelId: "deepseek-chat",
      }),
      enabled: true,
    },
  });

  const qwen = await prisma.model.create({
    data: {
      name: "qwen3-max",
      displayName: "Qwen Max",
      apiConfig: JSON.stringify({
        apiKey: process.env.QWEN_API_KEY || "test-key",
        apiUrl:
          "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
        modelId: "qwen3-max",
      }),
      enabled: true,
    },
  });

  const claude = await prisma.model.create({
    data: {
      name: "Claude-3.5-Sonnet",
      displayName: "Claude 3.5 Sonnet",
      apiConfig: JSON.stringify({
        apiKey: process.env.CLAUDE_API_KEY || "test-key",
        apiUrl: "https://api.anthropic.com",
        modelId: "claude-3-5-sonnet-20241022",
      }),
      enabled: true,
    },
  });

  const gpt = await prisma.model.create({
    data: {
      name: "GPT-4",
      displayName: "GPT-4",
      apiConfig: JSON.stringify({
        apiKey: process.env.OPENAI_API_KEY || "test-key",
        apiUrl: "https://api.openai.com",
        modelId: "gpt-4",
      }),
      enabled: true,
    },
  });

  console.log(`✓ 创建了 ${4} 个 AI 模型`);

  // 2. 创建投资组合
  console.log("创建投资组合...");
  const portfolio1 = await prisma.portfolio.create({
    data: {
      modelId: deepseek.id,
      cash: 85000,
      totalValue: 115000,
      initialValue: 100000,
    },
  });

  const portfolio2 = await prisma.portfolio.create({
    data: {
      modelId: qwen.id,
      cash: 90000,
      totalValue: 108000,
      initialValue: 100000,
    },
  });

  const portfolio3 = await prisma.portfolio.create({
    data: {
      modelId: claude.id,
      cash: 92000,
      totalValue: 105000,
      initialValue: 100000,
    },
  });

  const portfolio4 = await prisma.portfolio.create({
    data: {
      modelId: gpt.id,
      cash: 88000,
      totalValue: 110000,
      initialValue: 100000,
    },
  });

  console.log(`✓ 创建了 ${4} 个投资组合`);

  // 3. 创建持仓
  console.log("创建持仓数据...");
  await prisma.position.createMany({
    data: [
      // DeepSeek 持仓
      {
        portfolioId: portfolio1.id,
        symbol: "NVDA",
        quantity: 50,
        avgPrice: 450,
        currentPrice: 480,
        marketValue: 24000,
        unrealizedPnL: 1500,
      },
      {
        portfolioId: portfolio1.id,
        symbol: "TSLA",
        quantity: 20,
        avgPrice: 250,
        currentPrice: 300,
        marketValue: 6000,
        unrealizedPnL: 1000,
      },
      // Qwen 持仓
      {
        portfolioId: portfolio2.id,
        symbol: "AAPL",
        quantity: 100,
        avgPrice: 170,
        currentPrice: 180,
        marketValue: 18000,
        unrealizedPnL: 1000,
      },
      // Claude 持仓
      {
        portfolioId: portfolio3.id,
        symbol: "MSFT",
        quantity: 30,
        avgPrice: 400,
        currentPrice: 433.33,
        marketValue: 13000,
        unrealizedPnL: 1000,
      },
      // GPT-4 持仓
      {
        portfolioId: portfolio4.id,
        symbol: "GOOGL",
        quantity: 150,
        avgPrice: 140,
        currentPrice: 146.67,
        marketValue: 22000,
        unrealizedPnL: 1000,
      },
    ],
  });

  console.log(`✓ 创建了持仓数据`);

  // 4. 创建投资组合历史快照
  console.log("创建投资组合历史快照...");
  const now = new Date();
  const snapshots = [];

  for (let i = 72; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);

    // DeepSeek 快照 (上涨趋势)
    const ds_value = 100000 + (15000 * (72 - i)) / 72 + Math.random() * 2000;
    snapshots.push({
      portfolioId: portfolio1.id,
      totalValue: ds_value,
      cash: 85000,
      positionValue: ds_value - 85000,
      returnPct: ((ds_value - 100000) / 100000) * 100,
      timestamp,
    });

    // Qwen 快照 (稳定上涨)
    const qw_value = 100000 + (8000 * (72 - i)) / 72 + Math.random() * 1000;
    snapshots.push({
      portfolioId: portfolio2.id,
      totalValue: qw_value,
      cash: 90000,
      positionValue: qw_value - 90000,
      returnPct: ((qw_value - 100000) / 100000) * 100,
      timestamp,
    });

    // Claude 快照 (波动)
    const cl_value = 100000 + (5000 * (72 - i)) / 72 + Math.sin(i / 10) * 3000;
    snapshots.push({
      portfolioId: portfolio3.id,
      totalValue: cl_value,
      cash: 92000,
      positionValue: cl_value - 92000,
      returnPct: ((cl_value - 100000) / 100000) * 100,
      timestamp,
    });

    // GPT-4 快照 (强势上涨)
    const gpt_value = 100000 + (10000 * (72 - i)) / 72 + Math.random() * 1500;
    snapshots.push({
      portfolioId: portfolio4.id,
      totalValue: gpt_value,
      cash: 88000,
      positionValue: gpt_value - 88000,
      returnPct: ((gpt_value - 100000) / 100000) * 100,
      timestamp,
    });
  }

  await prisma.portfolioSnapshot.createMany({ data: snapshots });
  console.log(`✓ 创建了 ${snapshots.length} 条投资组合快照`);

  // 5. 创建交易记录
  console.log("创建交易记录...");
  const trade1 = await prisma.trade.create({
    data: {
      modelId: deepseek.id,
      symbol: "NVDA",
      side: "BUY",
      quantity: 50,
      price: 450,
      amount: 22500,
      rationale:
        "英伟达在AI芯片领域占据主导地位，随着AI应用的爆发，需求将持续增长。技术指标显示突破关键阻力位，建议买入。",
      status: "EXECUTED",
      executedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  const trade2 = await prisma.trade.create({
    data: {
      modelId: deepseek.id,
      symbol: "TSLA",
      side: "BUY",
      quantity: 20,
      price: 250,
      amount: 5000,
      rationale:
        "特斯拉Q4交付量超预期，FSD技术取得重大突破，市场情绪积极，短期看涨。",
      status: "EXECUTED",
      executedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
  });

  const trade3 = await prisma.trade.create({
    data: {
      modelId: qwen.id,
      symbol: "AAPL",
      side: "BUY",
      quantity: 100,
      price: 170,
      amount: 17000,
      rationale:
        "苹果新品发布会反响热烈，iPhone销量预期上调，加上服务业务增长强劲，值得配置。",
      status: "EXECUTED",
      executedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  const trade4 = await prisma.trade.create({
    data: {
      modelId: claude.id,
      symbol: "MSFT",
      side: "BUY",
      quantity: 30,
      price: 400,
      amount: 12000,
      rationale:
        "微软云业务Azure增长强劲，与OpenAI的合作深化，AI战略清晰，长期看好。",
      status: "EXECUTED",
      executedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
  });

  const trade5 = await prisma.trade.create({
    data: {
      modelId: gpt.id,
      symbol: "GOOGL",
      side: "BUY",
      quantity: 150,
      price: 140,
      amount: 21000,
      rationale:
        "Google的Gemini模型表现优异，搜索业务稳定，广告收入回暖，估值合理。",
      status: "EXECUTED",
      executedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  });

  // 已平仓的交易
  const trade6 = await prisma.trade.create({
    data: {
      modelId: deepseek.id,
      symbol: "META",
      side: "BUY",
      quantity: 30,
      price: 300,
      amount: 9000,
      rationale: "Meta的VR业务开始盈利，广告业务恢复增长，估值吸引人。",
      status: "EXECUTED",
      executedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    },
  });

  const trade7 = await prisma.trade.create({
    data: {
      modelId: deepseek.id,
      symbol: "META",
      side: "SELL",
      quantity: 30,
      price: 320,
      amount: 9600,
      rationale: "达到目标价位，且技术指标显示超买，选择获利了结。",
      status: "CLOSED",
      executedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      pnl: 600,
    },
  });

  console.log(`✓ 创建了 ${7} 条交易记录`);

  // 6. 创建反思记录
  console.log("创建反思记录...");
  await prisma.reflection.create({
    data: {
      tradeId: trade7.id,
      modelId: deepseek.id,
      content:
        "这是一次成功的波段操作。买入时机准确，Meta刚刚发布了优秀的财报。持仓期间股价上涨了6.67%，获利了结的时机也比较合理。经验教训：科技股在财报季要特别关注，好的财报往往能带来短期爆发。",
      pnl: 600,
      score: 8,
    },
  });

  console.log(`✓ 创建了反思记录`);

  // 7. 创建股票池
  console.log("创建股票池...");
  await prisma.stockPool.create({
    data: {
      name: "AI & Tech Stocks 2024",
      symbols: JSON.stringify([
        "NVDA",
        "TSLA",
        "AAPL",
        "MSFT",
        "GOOGL",
        "META",
        "AMZN",
        "AMD",
        "NFLX",
        "BABA",
      ]),
      createdBy: "AI",
      reason:
        "这些是2024年最具潜力的科技股，涵盖了AI芯片、云计算、电动车、电商等热门赛道。",
      active: true,
    },
  });

  console.log(`✓ 创建了股票池`);

  // 8. 创建市场数据
  console.log("创建市场数据...");
  const symbols = [
    "NVDA",
    "TSLA",
    "AAPL",
    "MSFT",
    "GOOGL",
    "META",
    "AMZN",
    "AMD",
    "NFLX",
    "BABA",
  ];
  const marketDataRecords = [];

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    for (const symbol of symbols) {
      // 生成模拟的股价数据（基于真实股价范围）
      let basePrice = 100;
      if (symbol === "NVDA") basePrice = 470;
      else if (symbol === "TSLA") basePrice = 280;
      else if (symbol === "AAPL") basePrice = 175;
      else if (symbol === "MSFT") basePrice = 420;
      else if (symbol === "GOOGL") basePrice = 143;
      else if (symbol === "META") basePrice = 315;
      else if (symbol === "AMZN") basePrice = 180;
      else if (symbol === "AMD") basePrice = 160;
      else if (symbol === "NFLX") basePrice = 650;
      else if (symbol === "BABA") basePrice = 85;

      const volatility = basePrice * 0.02; // 2% 波动
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const high = open + Math.random() * volatility;
      const low = open - Math.random() * volatility;
      const close = low + Math.random() * (high - low);
      const volume = Math.floor(10000000 + Math.random() * 5000000);

      marketDataRecords.push({
        symbol,
        date,
        open,
        high,
        low,
        close,
        volume,
      });
    }
  }

  await prisma.marketData.createMany({ data: marketDataRecords });
  console.log(`✓ 创建了 ${marketDataRecords.length} 条市场数据`);

  // 9. 创建新闻数据
  console.log("创建新闻数据...");
  const newsRecords = [
    {
      symbol: "NVDA",
      title: "英伟达发布新一代AI芯片，性能提升3倍",
      summary:
        "英伟达在GTC大会上发布了最新的Blackwell架构GPU，AI训练性能相比上一代提升3倍，引发市场热烈反响。",
      sentiment: "POSITIVE",
      source: "TechCrunch",
      url: "https://techcrunch.com/nvidia-blackwell",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      symbol: "TSLA",
      title: "特斯拉Q4交付量超预期，全年目标有望达成",
      summary:
        "特斯拉公布Q4交付数据，环比增长15%，超出华尔街预期。Model 3和Model Y销量强劲。",
      sentiment: "POSITIVE",
      source: "Reuters",
      url: "https://reuters.com/tesla-q4",
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      symbol: "AAPL",
      title: "苹果iPhone 16系列订单强劲，供应链加速生产",
      summary:
        "产业链消息显示，iPhone 16 Pro系列预售火爆，苹果要求供应链提高产能以满足需求。",
      sentiment: "POSITIVE",
      source: "Bloomberg",
      url: "https://bloomberg.com/apple-iphone16",
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      symbol: "MSFT",
      title: "微软Azure云服务增长强劲，AI服务贡献显著",
      summary:
        "微软财报显示Azure云服务同比增长30%，其中AI相关服务贡献了10个百分点的增长。",
      sentiment: "POSITIVE",
      source: "CNBC",
      url: "https://cnbc.com/microsoft-azure",
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      symbol: "GOOGL",
      title: "Google Gemini模型获得突破，多项测试超越GPT-4",
      summary:
        "Google发布的Gemini Ultra模型在多项基准测试中超越OpenAI的GPT-4，AI竞争格局生变。",
      sentiment: "POSITIVE",
      source: "The Verge",
      url: "https://theverge.com/google-gemini",
      publishedAt: new Date(Date.now() - 15 * 60 * 60 * 1000),
    },
    {
      symbol: "META",
      title: "Meta Quest 3销量超预期，VR业务首次实现盈利",
      summary:
        "Meta Reality Labs部门本季度首次实现盈利，Quest 3头显销量强劲，VR生态日趋成熟。",
      sentiment: "POSITIVE",
      source: "The Information",
      url: "https://theinformation.com/meta-quest3",
      publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    },
    {
      symbol: null,
      title: "美联储暗示明年可能降息，科技股受益",
      summary:
        "美联储主席鲍威尔在新闻发布会上表示，如果通胀继续下行，明年可能考虑降息，科技股普遍上涨。",
      sentiment: "POSITIVE",
      source: "Wall Street Journal",
      url: "https://wsj.com/fed-rates",
      publishedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
    {
      symbol: "AMD",
      title: "AMD发布新一代数据中心处理器，挑战英特尔地位",
      summary:
        "AMD推出EPYC 9004系列处理器，性能和能效比均优于竞品，有望进一步扩大数据中心市场份额。",
      sentiment: "POSITIVE",
      source: "AnandTech",
      url: "https://anandtech.com/amd-epyc",
      publishedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
    },
    {
      symbol: "NFLX",
      title: "Netflix新剧集创收视纪录，会员增长超预期",
      summary:
        "Netflix热门剧集《鱿鱼游戏2》创下平台收视纪录，带动会员订阅大幅增长，股价走强。",
      sentiment: "POSITIVE",
      source: "Variety",
      url: "https://variety.com/netflix-squid-game",
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      symbol: "BABA",
      title: "阿里巴巴股票回购计划获批，信心提振市场",
      summary:
        "阿里巴巴董事会批准了250亿美元的股票回购计划，显示管理层对公司长期发展的信心。",
      sentiment: "POSITIVE",
      source: "South China Morning Post",
      url: "https://scmp.com/alibaba-buyback",
      publishedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    },
  ];

  await prisma.newsData.createMany({ data: newsRecords });
  console.log(`✓ 创建了 ${newsRecords.length} 条新闻数据`);

  // 10. 创建系统配置
  console.log("创建系统配置...");
  await prisma.systemConfig.createMany({
    data: [
      {
        key: "trading_enabled",
        value: JSON.stringify({ enabled: true }),
      },
      {
        key: "trading_interval",
        value: JSON.stringify({ hours: 4 }),
      },
      {
        key: "max_position_size",
        value: JSON.stringify({ percent: 20 }),
      },
      {
        key: "max_total_position",
        value: JSON.stringify({ percent: 80 }),
      },
    ],
  });

  console.log(`✓ 创建了系统配置`);

  console.log("\n✅ 所有测试数据已成功插入！");
  console.log("\n数据统计：");
  console.log(`- AI模型: 4个`);
  console.log(`- 投资组合: 4个`);
  console.log(`- 持仓: ${await prisma.position.count()}条`);
  console.log(`- 投资组合快照: ${await prisma.portfolioSnapshot.count()}条`);
  console.log(`- 交易记录: 7条`);
  console.log(`- 反思记录: 1条`);
  console.log(`- 股票池: 1个`);
  console.log(`- 市场数据: ${await prisma.marketData.count()}条`);
  console.log(`- 新闻数据: ${await prisma.newsData.count()}条`);
  console.log(`- 系统配置: ${await prisma.systemConfig.count()}条`);
}

main()
  .catch((e) => {
    console.error("❌ 错误:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
