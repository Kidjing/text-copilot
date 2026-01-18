interface SettingsPanelProps {
  /** 温度值 */
  temperature: number;
  /** 温度变化回调 */
  onTemperatureChange: (value: number) => void;
  /** 最大 Token 数 */
  maxTokens: number;
  /** 最大 Token 数变化回调 */
  onMaxTokensChange: (value: number) => void;
  /** 防抖延迟 */
  debounceMs: number;
  /** 防抖延迟变化回调 */
  onDebounceMsChange: (value: number) => void;
  /** 是否展开 */
  isExpanded: boolean;
  /** 展开/收起回调 */
  onToggleExpand: () => void;
}

/**
 * 设置面板组件
 */
const SettingsPanel = ({
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  debounceMs,
  onDebounceMsChange,
  isExpanded,
  onToggleExpand,
}: SettingsPanelProps) => {
  return (
    <div className="border-b border-gray-700 bg-gray-800/50">
      {/* 折叠按钮 */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? '收起设置' : '展开设置'}
        tabIndex={0}
      >
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>补全设置</span>
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* 设置内容 */}
      {isExpanded && (
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          {/* 温度 */}
          <div className="flex flex-col gap-1">
            <label htmlFor="temperature-input" className="text-xs text-gray-400">
              温度 (Temperature): {temperature}
            </label>
            <input
              id="temperature-input"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
              aria-label="调整温度"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>精确</span>
              <span>创意</span>
            </div>
          </div>

          {/* 最大 Token 数 */}
          <div className="flex flex-col gap-1">
            <label htmlFor="max-tokens-input" className="text-xs text-gray-400">
              最大补全长度: {maxTokens}
            </label>
            <input
              id="max-tokens-input"
              type="range"
              min="16"
              max="256"
              step="16"
              value={maxTokens}
              onChange={(e) => onMaxTokensChange(parseInt(e.target.value, 10))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
              aria-label="调整最大补全长度"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>16</span>
              <span>256</span>
            </div>
          </div>

          {/* 防抖延迟 */}
          <div className="flex flex-col gap-1">
            <label htmlFor="debounce-input" className="text-xs text-gray-400">
              触发延迟: {debounceMs}ms
            </label>
            <input
              id="debounce-input"
              type="range"
              min="200"
              max="1500"
              step="100"
              value={debounceMs}
              onChange={(e) => onDebounceMsChange(parseInt(e.target.value, 10))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
              aria-label="调整触发延迟"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>快速</span>
              <span>稳定</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
