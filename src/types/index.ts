/** API 提供商类型 */
export type ApiProvider = 'ollama' | 'openai';

/** Ollama API 请求参数 */
export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

/** Ollama API 响应 */
export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/** Ollama 模型信息 */
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

/** Ollama 模型列表响应 */
export interface OllamaModelsResponse {
  models: OllamaModel[];
}

/** OpenAI API 请求参数 */
export interface OpenAICompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
}

/** OpenAI API 响应 */
export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** OpenAI 模型信息 */
export interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

/** 补全配置 */
export interface CompletionConfig {
  provider: ApiProvider;
  model: string;
  maxTokens: number;
  temperature: number;
  debounceMs: number;
  stopSequences: string[];
  // OpenAI 特有配置
  openai?: {
    baseUrl: string;
    apiKey: string;
    timeout?: number;
  };
  // Ollama 特有配置
  ollama?: {
    baseUrl: string;
  };
}

/** 补全状态 */
export type CompletionStatus = 'idle' | 'loading' | 'success' | 'error';

/** 补全结果 */
export interface CompletionResult {
  text: string;
  status: CompletionStatus;
  error?: string;
  duration?: number;
}

/** 默认补全配置 */
export const DEFAULT_COMPLETION_CONFIG: CompletionConfig = {
  provider: 'ollama',
  model: 'qwen2.5-coder:1.5b',
  maxTokens: 64,
  temperature: 0.2,
  debounceMs: 500,
  stopSequences: ['\n\n', '```', '"""', "'''"],
  ollama: {
    baseUrl: 'http://localhost:11434',
  },
};
