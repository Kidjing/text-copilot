import { useState, useCallback, useRef } from 'react';
import type {
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OpenAICompletionRequest,
  OpenAICompletionResponse,
  CompletionConfig,
  CompletionResult,
  CompletionStatus,
} from '../types';
import { DEFAULT_COMPLETION_CONFIG } from '../types';
import { getCompletionConfig } from '../utils/config';

interface UseAICompletionOptions {
  config?: Partial<CompletionConfig>;
  onCompletionStart?: () => void;
  onCompletionEnd?: (result: CompletionResult) => void;
}

interface UseAICompletionReturn {
  requestCompletion: (context: string) => Promise<string>;
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
    async (context: string): Promise<string> => {
      // 取消之前的请求
      cancelCompletion();

      // 如果上下文太短，不请求补全
      if (context.trim().length < 2) {
        return '';
      }

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      setStatus('loading');
      setError(null);
      onCompletionStart?.();

      const startTime = Date.now();

      try {
        let completion = '';

        // 根据配置的 provider 选择不同的 API
        if (config.provider === 'openai') {
          completion = await requestOpenAICompletion(
            context,
            config,
            abortControllerRef.current.signal
          );
        } else {
          completion = await requestOllamaCompletion(
            context,
            config,
            abortControllerRef.current.signal
          );
        }

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
 * 请求 Ollama 补全
 */
async function requestOllamaCompletion(
  context: string,
  config: CompletionConfig,
  signal: AbortSignal
): Promise<string> {
  const prompt = `请续写以下内容，直接输出续写部分，不要重复原文，不要解释：

${context}`;

  const requestBody: OllamaGenerateRequest = {
    model: config.model,
    prompt,
    stream: false,
    options: {
      temperature: config.temperature,
      num_predict: config.maxTokens,
      stop: config.stopSequences,
      top_p: 0.95,
    },
  };

  // 发送请求到 Ollama API
  // 使用 Vite 代理避免 CORS 问题
  const response = await fetch('/api/ollama/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Ollama API 错误: ${response.status} ${response.statusText}`);
  }

  const data: OllamaGenerateResponse = await response.json();
  return data.response || '';
}

/**
 * 请求 OpenAI 补全
 */
async function requestOpenAICompletion(
  context: string,
  config: CompletionConfig,
  signal: AbortSignal
): Promise<string> {
  if (!config.openai?.apiKey) {
    throw new Error('OpenAI API Key 未配置');
  }

  const requestBody: OpenAICompletionRequest = {
    model: config.model,
    messages: [
      {
        role: 'system',
        content: '你是一个代码补全助手。请根据用户提供的上下文，续写代码或文本。只输出续写的部分，不要重复原文，不要添加解释。',
      },
      {
        role: 'user',
        content: `请续写以下内容：\n\n${context}`,
      },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stop: config.stopSequences,
    stream: false,
  };

  const response = await fetch(`${config.openai.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API 错误: ${response.status} ${errorText}`);
  }

  const data: OpenAICompletionResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

export default useAICompletion;
