// 生成72小时的模拟历史数据
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHistoryData() {
  console.log('🌱 开始生成历史数据...');

  try {
    // 获取所有模型
    const models = await prisma.model.findMany({
      include: { portfolio: true },
    });

    if (models.length === 0) {
      console.log('❌ 未找到模型，请先运行系统创建模型');
      return;
    }

    console.log(`📊 找到 ${models.length} 个模型`);

    // 生成72小时的数据（每小时一个快照）
    const hoursBack = 72;
    const now = new Date();

    for (const model of models) {
      if (!model.portfolio) {
        console.log(`⚠️  模型 ${model.displayName} 没有投资组合，跳过`);
        continue;
      }

      console.log(`\n📈 为 ${model.displayName} 生成历史数据...`);

      const initialValue = model.portfolio.initialValue;
      let previousValue = initialValue;

      // 删除已有的历史快照
      await prisma.portfolioSnapshot.deleteMany({
        where: { portfolioId: model.portfolio.id },
      });

      // 生成历史数据
      for (let i = hoursBack; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);

        // 模拟资产变化（随机波动 -2% 到 +2%，总体略微上涨趋势）
        const randomChange = (Math.random() - 0.48) * 0.02; // 略微偏向正值
        const newValue = previousValue * (1 + randomChange);

        // 模拟现金和持仓比例（70-80%资金在持仓中）
        const positionRatio = 0.7 + Math.random() * 0.1;
        const positionValue = newValue * positionRatio;
        const cash = newValue - positionValue;

        // 计算收益率
        const returnPct = ((newValue - initialValue) / initialValue) * 100;

        await prisma.portfolioSnapshot.create({
          data: {
            portfolioId: model.portfolio.id,
            totalValue: newValue,
            cash: cash,
            positionValue: positionValue,
            returnPct: returnPct,
            timestamp: timestamp,
          },
        });

        previousValue = newValue;

        // 每10小时输出一次进度
        if (i % 10 === 0) {
          console.log(
            `  ⏰ ${timestamp.toLocaleString('zh-CN')}: $${newValue.toFixed(2)} (${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%)`
          );
        }
      }

      // 更新当前投资组合的总资产为最新值
      await prisma.portfolio.update({
        where: { id: model.portfolio.id },
        data: {
          totalValue: previousValue,
          cash: previousValue * 0.25, // 假设25%现金
        },
      });

      console.log(`✅ ${model.displayName} 历史数据生成完成！`);
      console.log(`   初始资产: $${initialValue.toFixed(2)}`);
      console.log(`   当前资产: $${previousValue.toFixed(2)}`);
      console.log(`   收益率: ${((previousValue - initialValue) / initialValue * 100).toFixed(2)}%`);
    }

    console.log('\n🎉 所有历史数据生成完成！');
    console.log(`📊 共生成 ${hoursBack + 1} 个时间点的数据`);
  } catch (error) {
    console.error('❌ 生成历史数据时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
seedHistoryData()
  .then(() => {
    console.log('\n✨ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });

