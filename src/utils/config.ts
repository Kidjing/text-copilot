import type { CompletionConfig, ApiProvider } from '../types';

/**
 * 配置管理工具
 * 从 config.env.yaml 加载配置（在实际应用中）
 * 目前使用硬编码配置，可以通过环境变量覆盖
 */

interface AppConfig {
  provider: ApiProvider;
  ollama: {
    baseUrl: string;
    model: string;
    maxTokens: number;
    temperature: number;
    debounceMs: number;
    stopSequences: string[];
  };
  openai: {
    baseUrl: string;
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    debounceMs: number;
    stopSequences: string[];
    timeout: number;
  };
}

/**
 * 默认配置
 * 对应 config.env.yaml 的内容
 */
const DEFAULT_CONFIG: AppConfig = {
  provider: 'ollama',
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5-coder:1.5b',
    maxTokens: 64,
    temperature: 0.2,
    debounceMs: 500,
    stopSequences: ['\n\n', '```', '"""', "'''"],
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    maxTokens: 64,
    temperature: 0.2,
    debounceMs: 500,
    stopSequences: ['\n\n', '```'],
    timeout: 10000,
  },
};

/**
 * 从环境变量加载配置
 */
function loadConfigFromEnv(): AppConfig {
  const config = { ...DEFAULT_CONFIG };

  // 从环境变量读取配置
  const provider = import.meta.env.VITE_AI_PROVIDER as ApiProvider;
  if (provider) {
    config.provider = provider;
  }

  // Ollama 配置
  if (import.meta.env.VITE_OLLAMA_BASE_URL) {
    config.ollama.baseUrl = import.meta.env.VITE_OLLAMA_BASE_URL;
  }
  if (import.meta.env.VITE_OLLAMA_MODEL) {
    config.ollama.model = import.meta.env.VITE_OLLAMA_MODEL;
  }

  // OpenAI 配置
  if (import.meta.env.VITE_OPENAI_BASE_URL) {
    config.openai.baseUrl = import.meta.env.VITE_OPENAI_BASE_URL;
  }
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    config.openai.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  }
  if (import.meta.env.VITE_OPENAI_MODEL) {
    config.openai.model = import.meta.env.VITE_OPENAI_MODEL;
  }

  return config;
}

/**
 * 获取应用配置
 */
export function getAppConfig(): AppConfig {
  return loadConfigFromEnv();
}

/**
 * 获取补全配置
 */
export function getCompletionConfig(): CompletionConfig {
  const appConfig = getAppConfig();
  const provider = appConfig.provider;

  if (provider === 'openai') {
    return {
      provider: 'openai',
      model: appConfig.openai.model,
      maxTokens: appConfig.openai.maxTokens,
      temperature: appConfig.openai.temperature,
      debounceMs: appConfig.openai.debounceMs,
      stopSequences: appConfig.openai.stopSequences,
      openai: {
        baseUrl: appConfig.openai.baseUrl,
        apiKey: appConfig.openai.apiKey,
        timeout: appConfig.openai.timeout,
      },
    };
  }

  // 默认使用 Ollama
  return {
    provider: 'ollama',
    model: appConfig.ollama.model,
    maxTokens: appConfig.ollama.maxTokens,
    temperature: appConfig.ollama.temperature,
    debounceMs: appConfig.ollama.debounceMs,
    stopSequences: appConfig.ollama.stopSequences,
    ollama: {
      baseUrl: appConfig.ollama.baseUrl,
    },
  };
}

/**
 * 设置 API 提供商
 */
export function setProvider(provider: ApiProvider): void {
  // 在实际应用中，这里可以保存到 localStorage 或其他持久化存储
  console.log(`切换 API 提供商到: ${provider}`);
}
