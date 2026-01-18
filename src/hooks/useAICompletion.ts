import { useState, useCallback, useRef } from 'react';
import type {
  OpenAICompletionRequest,
  OpenAICompletionResponse,
  CompletionConfig,
  CompletionResult,
  CompletionStatus,
  FIMContext,
} from '../types';
import { DEFAULT_COMPLETION_CONFIG } from '../types';
import { getCompletionConfig } from '../utils/config';

interface UseAICompletionOptions {
  config?: Partial<CompletionConfig>;
  onCompletionStart?: () => void;
  onCompletionEnd?: (result: CompletionResult) => void;
}

interface UseAICompletionReturn {
  requestCompletion: (context: FIMContext) => Promise<string>;
  cancelCompletion: () => void;
  status: CompletionStatus;
  error: string | null;
  lastResult: CompletionResult | null;
  config: CompletionConfig;
  updateConfig: (newConfig: Partial<CompletionConfig>) => void;
}

/**
 * AI 文本补全 Hook
 * 支持多种 AI API 提供商（Ollama、OpenAI 等）进行代码/文本补全
 */
export const useAICompletion = (
  options: UseAICompletionOptions = {}
): UseAICompletionReturn => {
  const { onCompletionStart, onCompletionEnd } = options;

  // 合并配置，优先使用从配置文件加载的配置
  const [config, setConfig] = useState<CompletionConfig>(() => {
    const loadedConfig = getCompletionConfig();
    return {
      ...DEFAULT_COMPLETION_CONFIG,
      ...loadedConfig,
      ...options.config,
    };
  });

  const [status, setStatus] = useState<CompletionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CompletionResult | null>(null);

  // 用于取消请求的 AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 更新配置
   */
  const updateConfig = useCallback((newConfig: Partial<CompletionConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  /**
   * 取消正在进行的补全请求
   */
  const cancelCompletion = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
  }, []);

  /**
   * 请求补全
   */
  const requestCompletion = useCallback(
    async (context: FIMContext): Promise<string> => {
      // 取消之前的请求
      cancelCompletion();

      // 如果上下文太短，不请求补全
      if (context.prefix.trim().length < 2) {
        return '';
      }

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      setStatus('loading');
      setError(null);
      onCompletionStart?.();

      const startTime = Date.now();

      try {
        // 使用统一的请求函数
        let completion = await requestAICompletion(
          context,
          config,
          abortControllerRef.current.signal
        );

        const duration = Date.now() - startTime;

        // 清理补全文本
        completion = cleanCompletionText(completion, config.stopSequences);

        const result: CompletionResult = {
          text: completion,
          status: 'success',
          duration,
        };

        setLastResult(result);
        setStatus('success');
        onCompletionEnd?.(result);

        return completion;
      } catch (err) {
        // 如果是取消请求，不算错误
        if (err instanceof Error && err.name === 'AbortError') {
          setStatus('idle');
          return '';
        }

        const errorMessage = err instanceof Error ? err.message : '未知错误';
        const result: CompletionResult = {
          text: '',
          status: 'error',
          error: errorMessage,
        };

        setError(errorMessage);
        setLastResult(result);
        setStatus('error');
        onCompletionEnd?.(result);

        console.error('补全请求失败:', err);
        return '';
      }
    },
    [config, cancelCompletion, onCompletionStart, onCompletionEnd]
  );

  return {
    requestCompletion,
    cancelCompletion,
    status,
    error,
    lastResult,
    config,
    updateConfig,
  };
};

/**
 * 清理补全文本
 * 移除不需要的内容和处理停止序列
 */
const cleanCompletionText = (text: string, stopSequences: string[]): string => {
  if (!text) return '';
  
  let cleaned = text;

  // 处理停止序列
  for (const stop of stopSequences) {
    const index = cleaned.indexOf(stop);
    if (index !== -1) {
      cleaned = cleaned.substring(0, index);
    }
  }

  // 移除特殊标记
  cleaned = cleaned.replace(/<\|fim_\w+\|>/g, '');
  cleaned = cleaned.replace(/<\|endoftext\|>/g, '');
  cleaned = cleaned.replace(/<\|im_\w+\|>/g, '');
  cleaned = cleaned.replace(/<\|end\|>/g, '');
  
  // 移除可能的引号包裹（有些模型会用引号包裹输出）
  cleaned = cleaned.replace(/^["']|["']$/g, '');

  // 对于多行补全，只保留合理的几行（最多3行）
  const lines = cleaned.split('\n').filter(line => line.trim() !== '');
  if (lines.length > 3) {
    cleaned = lines.slice(0, 3).join('\n');
  } else {
    cleaned = lines.join('\n');
  }

  // 如果补全以换行开头，去掉开头的换行
  cleaned = cleaned.replace(/^\n+/, '');

  return cleaned.trimEnd();
};

/**
 * 构建 FIM 格式的 prompt
 * 根据 suffix 是否有值自动判断模式：
 * - 补全模式（suffix 有值）：<|fim_prefix|>{prefix}<|fim_suffix|>{suffix}<|fim_middle|>
 * - 续写模式（suffix 为空）：<|fim_prefix|>{prefix}<|fim_middle|>
 */
const buildFIMPrompt = (context: FIMContext): string => {
  const { prefix, suffix } = context;
  
  // 根据 suffix 是否有实际内容判断模式
  const hasSuffix = suffix && suffix.trim().length > 0;
  
  if (hasSuffix) {
    // 补全模式（填充光标前后之间的内容）
    return `<|fim_prefix|>${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`;
  } else {
    // 续写模式（在光标位置继续生成）
    return `<|fim_prefix|>${prefix}<|fim_middle|>`;
  }
};

/**
 * 统一的 AI 补全请求函数
 * Ollama 和 OpenAI 都使用 OpenAI 兼容的 chat/completions 接口
 */
async function requestAICompletion(
  context: FIMContext,
  config: CompletionConfig,
  signal: AbortSignal
): Promise<string> {
  const prompt = buildFIMPrompt(context);

  // 根据 provider 确定 API 地址和请求头
  let apiUrl: string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.provider === 'openai') {
    if (!config.openai?.apiKey) {
      throw new Error('OpenAI API Key 未配置');
    }
    apiUrl = `${config.openai.baseUrl}/chat/completions`;
    headers['Authorization'] = `Bearer ${config.openai.apiKey}`;
  } else {
    // Ollama 使用 OpenAI 兼容接口
    // 开发环境使用 Vite 代理避免 CORS 问题，生产环境直接使用配置的 baseUrl
    const isDev = import.meta.env.DEV;
    const baseUrl = config.ollama?.baseUrl || 'http://localhost:11434';
    
    if (isDev && baseUrl === 'http://localhost:11434') {
      // 本地开发使用代理
      apiUrl = '/api/ollama/v1/chat/completions';
    } else {
      // 生产环境或自定义地址直接请求
      apiUrl = `${baseUrl}/v1/chat/completions`;
    }
  }

  // 统一的请求体格式（OpenAI 兼容）
  const requestBody: OpenAICompletionRequest = {
    model: config.model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stop: config.stopSequences,
    stream: false,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const providerName = config.provider === 'openai' ? 'OpenAI' : 'Ollama';
    throw new Error(`${providerName} API 错误: ${response.status} ${errorText}`);
  }

  const data: OpenAICompletionResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

export default useAICompletion;
