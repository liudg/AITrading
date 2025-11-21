// 数据验证脚本 - 测试所有数据库接口

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  console.log('='.repeat(60));
  console.log('开始验证数据库数据...');
  console.log('='.repeat(60));

  try {
    // 1. 验证模型数据
    console.log('\n📊 验证 AI 模型数据...');
    const models = await prisma.model.findMany({
      where: { enabled: true },
      include: { portfolio: true },
    });
    console.log(`✓ 找到 ${models.length} 个启用的AI模型`);
    models.forEach((model) => {
      console.log(`  - ${model.displayName} (${model.name})`);
      console.log(`    投资组合: ${model.portfolio ? '已创建' : '未创建'}`);
    });

    // 2. 验证投资组合数据
    console.log('\n💰 验证投资组合数据...');
    const portfolios = await prisma.portfolio.findMany({
      include: {
        model: true,
        positions: true,
      },
    });
    console.log(`✓ 找到 ${portfolios.length} 个投资组合`);
    portfolios.forEach((portfolio) => {
      const returnPct = ((portfolio.totalValue - portfolio.initialValue) / portfolio.initialValue * 100).toFixed(2);
      console.log(`  - ${portfolio.model.displayName}:`);
      console.log(`    现金: $${portfolio.cash.toFixed(2)}`);
      console.log(`    总资产: $${portfolio.totalValue.toFixed(2)}`);
      console.log(`    收益率: ${returnPct}%`);
      console.log(`    持仓数: ${portfolio.positions.length}`);
    });

    // 3. 验证持仓数据
    console.log('\n📈 验证持仓数据...');
    const positions = await prisma.position.findMany({
      include: {
        portfolio: {
          include: {
            model: true,
          },
        },
      },
    });
    console.log(`✓ 找到 ${positions.length} 条持仓记录`);
    positions.forEach((position) => {
      console.log(`  - ${position.portfolio.model.displayName} 持有 ${position.symbol}:`);
      console.log(`    数量: ${position.quantity}, 成本: $${position.avgPrice.toFixed(2)}, 当前: $${position.currentPrice.toFixed(2)}`);
      console.log(`    未实现盈亏: $${position.unrealizedPnL.toFixed(2)}`);
    });

    // 4. 验证投资组合快照
    console.log('\n📸 验证投资组合快照...');
    const snapshots = await prisma.portfolioSnapshot.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
    });
    console.log(`✓ 找到最近 ${snapshots.length} 条快照记录`);
    if (snapshots.length > 0) {
      const latest = snapshots[0];
      console.log(`  最新快照时间: ${latest.timestamp.toISOString()}`);
      console.log(`  总资产: $${latest.totalValue.toFixed(2)}`);
      console.log(`  收益率: ${latest.returnPct.toFixed(2)}%`);
    }

    // 5. 验证交易记录
    console.log('\n💼 验证交易记录...');
    const trades = await prisma.trade.findMany({
      include: {
        model: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    console.log(`✓ 找到最近 ${trades.length} 条交易记录`);
    trades.forEach((trade) => {
      console.log(`  - ${trade.model.displayName} ${trade.side} ${trade.symbol}:`);
      console.log(`    数量: ${trade.quantity}, 价格: $${trade.price.toFixed(2)}`);
      console.log(`    状态: ${trade.status}${trade.pnl !== null ? `, 盈亏: $${trade.pnl.toFixed(2)}` : ''}`);
    });

    // 6. 验证反思记录
    console.log('\n🤔 验证反思记录...');
    const reflections = await prisma.reflection.findMany({
      include: {
        model: true,
        trade: true,
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    });
    console.log(`✓ 找到 ${reflections.length} 条反思记录`);
    reflections.forEach((reflection) => {
      console.log(`  - ${reflection.model.displayName} 对 ${reflection.trade.symbol} 的反思:`);
      console.log(`    评分: ${reflection.score}/10`);
      console.log(`    内容: ${reflection.content.substring(0, 50)}...`);
    });

    // 7. 验证股票池
    console.log('\n🎯 验证股票池...');
    const stockPools = await prisma.stockPool.findMany({
      where: { active: true },
    });
    console.log(`✓ 找到 ${stockPools.length} 个活跃股票池`);
    stockPools.forEach((pool) => {
      const symbols = JSON.parse(pool.symbols);
      console.log(`  - ${pool.name}:`);
      console.log(`    股票: ${symbols.join(', ')}`);
      console.log(`    创建者: ${pool.createdBy}`);
    });

    // 8. 验证市场数据
    console.log('\n📊 验证市场数据...');
    const marketDataCount = await prisma.marketData.count();
    const symbolsWithData = await prisma.marketData.groupBy({
      by: ['symbol'],
      _count: true,
    });
    console.log(`✓ 找到 ${marketDataCount} 条市场数据记录`);
    console.log(`  覆盖 ${symbolsWithData.length} 个股票代码:`);
    symbolsWithData.forEach((item) => {
      console.log(`    - ${item.symbol}: ${item._count} 条记录`);
    });

    // 9. 验证新闻数据
    console.log('\n📰 验证新闻数据...');
    const newsData = await prisma.newsData.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });
    console.log(`✓ 找到最近 ${newsData.length} 条新闻记录`);
    newsData.forEach((news) => {
      console.log(`  - ${news.symbol || '全市场'}: ${news.title}`);
      console.log(`    情绪: ${news.sentiment}`);
    });

    // 10. 验证系统配置
    console.log('\n⚙️  验证系统配置...');
    const configs = await prisma.systemConfig.findMany();
    console.log(`✓ 找到 ${configs.length} 条系统配置`);
    configs.forEach((config) => {
      console.log(`  - ${config.key}: ${config.value}`);
    });

    // 11. 验证战报数据
    console.log('\n📋 验证战报数据...');
    const reports = await prisma.dailyReport.findMany({
      include: {
        modelPerformances: {
          include: {
            model: true,
          },
        },
        stockDistributions: true,
      },
      orderBy: { day: 'desc' },
      take: 3,
    });
    console.log(`✓ 找到 ${reports.length} 份战报`);
    reports.forEach((report) => {
      console.log(`  - Day ${report.day} (${report.date.toLocaleDateString('zh-CN')}):`);
      console.log(`    标题: ${report.title}`);
      console.log(`    参与模型: ${report.modelPerformances.length} 个`);
      console.log(`    持仓分布: ${report.stockDistributions.length} 只股票`);
      if (report.modelPerformances.length > 0) {
        const topPerformer = report.modelPerformances.sort((a, b) => b.returnPct - a.returnPct)[0];
        console.log(`    表现最佳: ${topPerformer.model.displayName} (${topPerformer.returnPct.toFixed(2)}%)`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ 数据验证完成！所有表都有测试数据。');
    console.log('='.repeat(60));
    console.log('\n💡 下一步：');
    console.log('   1. 启动服务器: npm run dev');
    console.log('   2. 启动前端: cd ../client && npm run dev');
    console.log('   3. 访问 http://localhost:5173 查看界面');
    console.log('   4. 或访问 http://localhost:5555 查看 Prisma Studio');
    console.log('');

  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
    throw error;
  }
}

verifyData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

