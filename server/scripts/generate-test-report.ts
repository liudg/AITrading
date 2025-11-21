// 生成测试战报数据

import { PrismaClient } from '@prisma/client';
import { ReportService } from '../src/services/report.service';

const prisma = new PrismaClient();
const reportService = new ReportService();

async function generateTestReport() {
  console.log('[Test] 生成测试战报数据...');

  try {
    // 获取所有模型
    const models = await prisma.model.findMany({
      where: { enabled: true },
      include: { portfolio: true },
    });

    if (models.length === 0) {
      console.error('没有找到启用的模型');
      return;
    }

    // 获取当前 Day 编号
    const existingReports = await prisma.dailyReport.count();
    const dayNumber = existingReports + 1;

    console.log(`生成 Day ${dayNumber} 战报...`);

    // 为每个模型创建测试交易
    for (const model of models) {
      if (!model.portfolio) continue;

      // 生成 3-8 笔随机交易
      const tradesCount = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < tradesCount; i++) {
        const symbols = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'META'];
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const quantity = Math.floor(Math.random() * 100) + 10;
        const price = Math.random() * 500 + 100;
        const amount = quantity * price;

        // 随机决定是否已平仓
        const isClosed = Math.random() > 0.3;
        const pnl = isClosed ? (Math.random() - 0.5) * 1000 : null;

        const rationales = [
          'RSI 指标显示超卖，技术面反转信号明确，市场情绪逐渐好转，是良好的建仓时机。',
          '财报数据超预期，营收同比增长 25%，管理层展现出强劲的执行力，长期增长潜力巨大。',
          '技术面走弱，均线死叉，MACD 指标转负，市场资金流出迹象明显，及时止损保护利润。',
          '行业利好政策出台，公司作为龙头企业将直接受益，市场预期显著提升，值得重点关注。',
          '量价齐升，成交量突破近期高点，多头力量增强，趋势确立，追涨买入。',
          '短期涨幅过大，技术指标超买，获利盘涌现，回调风险加大，部分止盈落袋为安。',
          '基本面稳健，估值合理，在当前市场环境下具备防御价值，适合长期配置。',
          '突破关键阻力位，向上空间打开，配合市场整体走强，有望延续上涨趋势。',
          '市场恐慌情绪蔓延，短期波动加剧，为规避风险暂时退出观望，等待更好的入场时机。',
          '成交量萎缩，价格滞涨，主力资金流出迹象明显，市场热度下降，减仓降低风险敞口。',
        ];

        const rationale = rationales[Math.floor(Math.random() * rationales.length)];

        // 创建随机时间（今天 9:30 - 16:00）
        const now = new Date();
        const hours = Math.floor(Math.random() * 6.5) + 9.5;
        const minutes = Math.floor(Math.random() * 60);
        now.setHours(Math.floor(hours), minutes, 0, 0);

        await prisma.trade.create({
          data: {
            modelId: model.id,
            symbol,
            side,
            quantity,
            price,
            amount,
            rationale,
            status: isClosed ? 'CLOSED' : 'EXECUTED',
            pnl,
            executedAt: now,
            closedAt: isClosed ? now : null,
          },
        });
      }

      console.log(`✓ ${model.name}: 创建了 ${tradesCount} 笔交易`);
    }

    // 生成战报（直接调用服务）
    console.log('\n生成战报...');
    const reportDate = new Date();
    reportDate.setHours(0, 0, 0, 0);
    
    const reportId = await reportService.generateDailyReport(reportDate);
    
    // 获取生成的战报详情
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        modelPerformances: true,
        stockDistributions: true,
      },
    });
    
    if (report) {
      console.log(`✓ 战报生成成功: Day ${report.day}`);
      console.log(`  Report ID: ${report.id}`);
      console.log(`  包含 ${report.modelPerformances.length} 个模型的表现数据`);
      if (report.stockDistributions && report.stockDistributions.length > 0) {
        console.log(`  持仓分布: ${report.stockDistributions.length} 只股票`);
      }
      console.log(`\n✨ 访问前端查看: http://localhost:5173/reports/${report.id}`);
      console.log(`   或访问列表: http://localhost:5173/reports`);
    } else {
      console.log(`✓ 战报生成成功，但无法获取详情`);
      console.log(`  Report ID: ${reportId}`);
    }
  } catch (error) {
    console.error('生成测试数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestReport();

