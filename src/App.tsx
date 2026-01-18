import { useState, useCallback, useEffect } from 'react';
import { RichTextEditor, StatusBar, SettingsPanel } from './components';
import { useAICompletion, useAIStatus } from './hooks';
import { DEFAULT_COMPLETION_CONFIG } from './types';
import type { FIMContext } from './types';

// 示例文本（适合富文本场景）
const EXAMPLE_TEXT = `🤖 AI 智能文本补全系统

在下方输入文字，AI 会自动提供补全建议。
按 Tab 键采纳补全，按 Esc 键取消。

试试输入一些内容：
- 今天天气
- 人工智能的发展
- 如何提高工作效率

`;

/**
 * 主应用组件
 */
const App = () => {
  // AI 服务状态
  const {
    isConnected,
    isChecking,
    models,
    error: connectionError,
    refreshModels,
  } = useAIStatus();

  // 补全配置状态
  const [selectedModel, setSelectedModel] = useState(DEFAULT_COMPLETION_CONFIG.model);
  const [temperature, setTemperature] = useState(DEFAULT_COMPLETION_CONFIG.temperature);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_COMPLETION_CONFIG.maxTokens);
  const [debounceMs, setDebounceMs] = useState(DEFAULT_COMPLETION_CONFIG.debounceMs);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // AI 补全 Hook
  const {
    requestCompletion,
    status: completionStatus,
    error: completionError,
    updateConfig,
  } = useAICompletion({
    config: {
      model: selectedModel,
      temperature,
      maxTokens,
    },
  });

  // 当模型列表加载后，检查默认模型是否存在
  useEffect(() => {
    if (models.length > 0) {
      const modelExists = models.some((m) => m.name === selectedModel);
      if (!modelExists) {
        // 查找 qwen 相关模型
        const qwenModel = models.find((m) => 
          m.name.toLowerCase().includes('qwen') || 
          m.name.toLowerCase().includes('coder')
        );
        if (qwenModel) {
          setSelectedModel(qwenModel.name);
        } else {
          // 否则使用第一个模型
          setSelectedModel(models[0].name);
        }
      }
    }
  }, [models, selectedModel]);

  // 更新配置
  useEffect(() => {
    updateConfig({
      model: selectedModel,
      temperature,
      maxTokens,
    });
  }, [selectedModel, temperature, maxTokens, updateConfig]);

  /**
   * 处理补全请求
   */
  const handleCompletionRequest = useCallback(
    async (context: FIMContext): Promise<string> => {
      if (!isConnected) {
        return '';
      }
      // 直接传递 FIMContext（包含 prefix 和 suffix）
      return requestCompletion(context);
    },
    [isConnected, requestCompletion]
  );

  /**
   * 切换设置面板
   */
  const handleToggleSettings = useCallback(() => {
    setSettingsExpanded((prev) => !prev);
  }, []);

  // 显示的错误信息
  const displayError = connectionError || completionError;

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-900 text-white">
      {/* 头部 */}
      <header className="border-b border-gray-700 bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <span className="text-2xl">🤖</span>
              <span>AI 智能文本补全</span>
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              支持多种 AI API 提供商（Ollama、OpenAI 等）
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* AI 服务链接 */}
            <a
              href="https://ollama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white"
              aria-label="访问 Ollama 官网"
              tabIndex={0}
            >
              Ollama ↗
            </a>
          </div>
        </div>
      </header>

      {/* 状态栏 */}
      <StatusBar
        isConnected={isConnected}
        isChecking={isChecking}
        error={displayError}
        models={models}
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
        onRefresh={refreshModels}
      />

      {/* 设置面板 */}
      <SettingsPanel
        temperature={temperature}
        onTemperatureChange={setTemperature}
        maxTokens={maxTokens}
        onMaxTokensChange={setMaxTokens}
        debounceMs={debounceMs}
        onDebounceMsChange={setDebounceMs}
        isExpanded={settingsExpanded}
        onToggleExpand={handleToggleSettings}
      />

      {/* 未连接提示 */}
      {!isConnected && !isChecking && (
        <div className="mx-4 mt-4 rounded-lg bg-yellow-900/30 p-4 text-yellow-400">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold">无法连接到 AI 服务</h3>
              <p className="mt-1 text-sm text-yellow-400/80">
                请确保 AI 服务已配置并正在运行。如果使用 Ollama，请按以下步骤启动：
              </p>
              <ol className="mt-2 list-inside list-decimal text-sm text-yellow-400/80">
                <li>
                  安装 Ollama:{' '}
                  <code className="rounded bg-gray-800 px-1">
                    brew install ollama
                  </code>
                </li>
                <li>
                  下载模型:{' '}
                  <code className="rounded bg-gray-800 px-1">
                    ollama pull qwen2.5-coder:1.5b
                  </code>
                </li>
                <li>
                  启动服务:{' '}
                  <code className="rounded bg-gray-800 px-1">ollama serve</code>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* 编辑器区域 */}
      <main className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-hidden rounded-lg border border-gray-700">
          <RichTextEditor
            defaultValue={EXAMPLE_TEXT}
            onCompletionRequest={handleCompletionRequest}
            isLoading={completionStatus === 'loading'}
            debounceMs={debounceMs}
            placeholder="在这里输入文字，AI 会自动提供补全建议..."
          />
        </div>
      </main>

      {/* 底部说明 */}
      <footer className="border-t border-gray-700 bg-gray-800 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-gray-700 px-1.5 py-0.5">Tab</kbd>
              <span>采纳补全</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-gray-700 px-1.5 py-0.5">Esc</kbd>
              <span>取消补全</span>
            </span>
            <span className="flex items-center gap-1">
              <span>💡</span>
              <span>输入后稍等片刻，AI 会自动生成补全建议</span>
            </span>
          </div>
          <span className="text-gray-500">
            基于 TipTap + AI
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
