import { getAppConfig, getCompletionConfig } from '../src/utils/config';

/**
 * 配置测试脚本
 * 用于验证配置是否正确加载
 */

console.log('=== AI 补全配置测试 ===\n');

// 获取应用配置
const appConfig = getAppConfig();
console.log('应用配置:');
console.log(`  提供商: ${appConfig.provider}`);
console.log('');

// 获取补全配置
const completionConfig = getCompletionConfig();
console.log('补全配置:');
console.log(`  提供商: ${completionConfig.provider}`);
console.log(`  模型: ${completionConfig.model}`);
console.log(`  最大 Token: ${completionConfig.maxTokens}`);
console.log(`  温度: ${completionConfig.temperature}`);
console.log(`  防抖延迟: ${completionConfig.debounceMs}ms`);
console.log(`  停止序列: ${JSON.stringify(completionConfig.stopSequences)}`);
console.log('');

// 根据提供商显示特定配置
if (completionConfig.provider === 'ollama') {
  console.log('Ollama 配置:');
  console.log(`  Base URL: ${completionConfig.ollama?.baseUrl}`);
  console.log('');
  console.log('✅ 使用 Ollama 本地模型');
  console.log('💡 确保 Ollama 服务正在运行: ollama serve');
} else if (completionConfig.provider === 'openai') {
  console.log('OpenAI 配置:');
  console.log(`  Base URL: ${completionConfig.openai?.baseUrl}`);
  console.log(`  API Key: ${completionConfig.openai?.apiKey ? '已设置 (***' + completionConfig.openai.apiKey.slice(-4) + ')' : '未设置'}`);
  console.log(`  超时: ${completionConfig.openai?.timeout}ms`);
  console.log('');
  
  if (!completionConfig.openai?.apiKey) {
    console.log('⚠️  警告: OpenAI API Key 未设置');
    console.log('💡 请在 .env.local 中设置 VITE_OPENAI_API_KEY');
  } else {
    console.log('✅ 使用 OpenAI API');
  }
}

console.log('\n=== 配置测试完成 ===');
