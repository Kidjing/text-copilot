import type { OllamaModel } from '../types';

interface StatusBarProps {
  /** Ollama 连接状态 */
  isConnected: boolean;
  /** 是否正在检查连接 */
  isChecking: boolean;
  /** 错误信息 */
  error: string | null;
  /** 可用模型列表 */
  models: OllamaModel[];
  /** 当前选中的模型 */
  selectedModel: string;
  /** 模型选择回调 */
  onModelSelect: (model: string) => void;
  /** 刷新回调 */
  onRefresh: () => void;
}

/**
 * 状态栏组件
 * 显示 Ollama 连接状态和模型选择器
 */
const StatusBar = ({
  isConnected,
  isChecking,
  error,
  models,
  selectedModel,
  onModelSelect,
  onRefresh,
}: StatusBarProps) => {
  /**
   * 格式化模型大小
   */
  const formatSize = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <div className="flex items-center justify-between bg-gray-800 px-4 py-2 text-sm">
      {/* 左侧：连接状态 */}
      <div className="flex items-center gap-4">
        {/* 连接指示器 */}
        <div className="flex items-center gap-2">
          {isChecking ? (
            <>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow-500" />
              <span className="text-yellow-400">检查连接...</span>
            </>
          ) : isConnected ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-green-400">Ollama 已连接</span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-red-400">未连接</span>
            </>
          )}
        </div>

        {/* 错误信息 */}
        {error && !isChecking && (
          <span className="text-red-400 text-xs">{error}</span>
        )}

        {/* 模型数量 */}
        {isConnected && models.length > 0 && (
          <span className="text-gray-400">
            {models.length} 个模型可用
          </span>
        )}
      </div>

      {/* 右侧：模型选择器和刷新按钮 */}
      <div className="flex items-center gap-3">
        {/* 模型选择器 */}
        {isConnected && models.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="model-select" className="text-gray-400">
              模型:
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => onModelSelect(e.target.value)}
              className="rounded bg-gray-700 px-2 py-1 text-white outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="选择模型"
            >
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name} ({formatSize(model.size)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 刷新按钮 */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isChecking}
          className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-gray-300 transition-colors hover:bg-gray-600 disabled:opacity-50"
          aria-label="刷新连接状态"
          tabIndex={0}
        >
          <svg
            className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>刷新</span>
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
