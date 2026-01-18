import { useState, useEffect, useCallback } from 'react';
import type { OllamaModel, OllamaModelsResponse } from '../types';

interface UseOllamaStatusReturn {
  isConnected: boolean;
  isChecking: boolean;
  models: OllamaModel[];
  error: string | null;
  checkConnection: () => Promise<boolean>;
  refreshModels: () => Promise<void>;
}

/**
 * Ollama 服务状态检测 Hook
 */
export const useOllamaStatus = (): UseOllamaStatusReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * 检查 Ollama 连接状态
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    setError(null);

    try {
      // 通过 Vite 代理访问 Ollama API
      const response = await fetch('/api/ollama/api/tags', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`无法连接到 Ollama: ${response.status}`);
      }

      const data: OllamaModelsResponse = await response.json();
      setModels(data.models || []);
      setIsConnected(true);
      setIsChecking(false);
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '无法连接到 Ollama 服务';
      setError(errorMessage);
      setIsConnected(false);
      setModels([]);
      setIsChecking(false);
      return false;
    }
  }, []);

  /**
   * 刷新模型列表
   */
  const refreshModels = useCallback(async (): Promise<void> => {
    await checkConnection();
  }, [checkConnection]);

  // 组件挂载时检查连接
  useEffect(() => {
    checkConnection();

    // 每 30 秒检查一次连接状态
    const interval = setInterval(() => {
      checkConnection();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    isConnected,
    isChecking,
    models,
    error,
    checkConnection,
    refreshModels,
  };
};

export default useOllamaStatus;
