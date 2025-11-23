#!/usr/bin/env tsx
// 配置检查工具

import dotenv from 'dotenv';
import { ConfigValidator } from '../src/lib/config-validator';

// 加载环境变量
dotenv.config();

console.log('\n');
console.log('═'.repeat(70));
console.log('🔍 AI Trading System - 配置检查工具');
console.log('═'.repeat(70));
console.log('\n');

// 验证配置
const result = ConfigValidator.validate();

if (!result.valid) {
  console.log('\n❌ 配置验证失败\n');
  console.log('错误列表：');
  result.errors.forEach(err => console.log(`  ${err}`));
  console.log('\n');
  
  if (result.warnings.length > 0) {
    console.log('警告列表：');
    result.warnings.forEach(warn => console.log(`  ${warn}`));
    console.log('\n');
  }
  
  console.log('💡 提示：');
  console.log('  1. 请在 server 目录下创建 .env 文件');
  console.log('  2. 参考 ENV_CONFIG.md 了解所需配置');
  console.log('  3. 至少需要配置 DEEPSEEK_API_KEY 和 QWEN_API_KEY');
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('\n');
  process.exit(1);
}

console.log('\n✅ 配置验证通过！\n');

if (result.warnings.length > 0) {
  console.log('⚠️  警告：');
  result.warnings.forEach(warn => console.log(`  ${warn}`));
  console.log('\n');
}

// 打印配置摘要
ConfigValidator.printSummary();

// 验证API密钥格式
console.log('\n🔑 验证API密钥格式...\n');
ConfigValidator.validateApiKeys().then(({ valid, errors }) => {
  if (valid) {
    console.log('✅ API密钥格式验证通过');
  } else {
    console.log('⚠️  API密钥格式警告：');
    errors.forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('🎉 配置检查完成！可以启动服务了');
  console.log('═'.repeat(70));
  console.log('\n');
});

