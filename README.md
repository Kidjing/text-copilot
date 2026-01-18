# AI 智能文本补全演示项目

使用 **Ollama / OpenAI + TipTap** 实现的代码智能补全演示项目。

## 功能特点

- 🤖 **AI 驱动补全** - 支持 Ollama 本地模型和 OpenAI API
- 👻 **幽灵文本提示** - 补全建议以灰色斜体显示，不打断输入
- ⌨️ **快捷键操作** - Tab 键采纳补全，Esc 键取消
- 🎨 **多语言支持** - 支持 JavaScript、TypeScript、Python 等多种语言
- ⚙️ **可配置参数** - 可调整温度、补全长度、触发延迟等
- 🔌 **多 API 支持** - 灵活切换 Ollama 和 OpenAI API

## 技术栈

- **前端框架**: React 18 + TypeScript
- **编辑器**: TipTap
- **AI 后端**: Ollama (本地运行) / OpenAI API
- **构建工具**: Vite
- **样式**: TailwindCSS

## 快速开始

### 方式一：使用 Ollama（本地运行，免费）

#### 1. 安装 Ollama

```bash
# macOS
brew install ollama

# 或从官网下载: https://ollama.ai
```

#### 2. 下载模型

```bash
# 下载 Qwen2.5-Coder 模型 (推荐)
ollama pull qwen2.5-coder:1.5b

# 或下载其他代码模型
ollama pull codellama:7b
ollama pull deepseek-coder:1.3b
```

#### 3. 启动 Ollama 服务

```bash
ollama serve
```

#### 4. 安装项目依赖并启动

```bash
cd text-copilot
npm install
npm run dev
```

### 方式二：使用 OpenAI API

#### 1. 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```bash
# 设置使用 OpenAI
VITE_AI_PROVIDER=openai

# 配置 OpenAI API
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_API_KEY=your-api-key-here
VITE_OPENAI_MODEL=gpt-3.5-turbo
```

#### 2. 安装项目依赖并启动

```bash
cd text-copilot
npm install
npm run dev
```

访问 http://localhost:5173 即可使用。

## 配置说明

### 配置文件

项目支持两种配置方式：

1. **config.env.yaml** - 默认配置文件（包含所有配置项的说明）
2. **.env.local** - 环境变量配置（优先级更高，用于覆盖默认配置）

### 环境变量说明

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `VITE_AI_PROVIDER` | API 提供商 (`ollama` 或 `openai`) | `ollama` |
| `VITE_OLLAMA_BASE_URL` | Ollama 服务地址 | `http://localhost:11434` |
| `VITE_OLLAMA_MODEL` | Ollama 模型名称 | `qwen2.5-coder:1.5b` |
| `VITE_OPENAI_BASE_URL` | OpenAI API 地址 | `https://api.openai.com/v1` |
| `VITE_OPENAI_API_KEY` | OpenAI API Key | `sk-...` |
| `VITE_OPENAI_MODEL` | OpenAI 模型名称 | `gpt-3.5-turbo` |

### 使用兼容 OpenAI API 的第三方服务

你可以使用任何兼容 OpenAI API 格式的服务，例如：

- **Azure OpenAI**: 修改 `VITE_OPENAI_BASE_URL` 为 Azure 端点
- **本地部署的模型**: 使用 vLLM、LocalAI 等工具部署
- **其他第三方 API**: 如 Anthropic Claude (通过适配器)

示例配置（Azure OpenAI）：

```bash
VITE_AI_PROVIDER=openai
VITE_OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
VITE_OPENAI_API_KEY=your-azure-api-key
VITE_OPENAI_MODEL=gpt-35-turbo
```

## 使用说明

1. **输入代码** - 在编辑器中输入代码
2. **等待补全** - 停止输入约 500ms 后，AI 会自动生成补全建议
3. **查看建议** - 补全建议以灰色斜体文本显示在光标后
4. **采纳补全** - 按 `Tab` 键采纳补全
5. **取消补全** - 按 `Esc` 键或继续输入即可取消

## 配置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 编程语言 | 代码高亮和补全上下文 | JavaScript |
| 温度 | 控制生成的随机性 (0-1) | 0.2 |
| 最大补全长度 | 单次补全的最大 Token 数 | 64 |
| 触发延迟 | 停止输入后等待多久触发补全 | 500ms |

## 项目结构

```
text-completion-demo/
├── src/
│   ├── components/
│   │   ├── RichTextEditor.tsx    # 编辑器组件
│   │   ├── StatusBar.tsx         # 状态栏组件
│   │   └── SettingsPanel.tsx     # 设置面板组件
│   ├── hooks/
│   │   ├── useAICompletion.ts  # AI 补全 Hook (支持多种 API)
│   │   └── useAIStatus.ts      # AI 状态检测 Hook
│   ├── utils/
│   │   └── config.ts             # 配置管理工具
│   ├── types/
│   │   └── index.ts              # TypeScript 类型定义
│   ├── App.tsx                   # 主应用组件
│   ├── main.tsx                  # 应用入口
│   └── index.css                 # 全局样式
├── config.env.yaml               # 默认配置文件
├── .env.example                  # 环境变量示例
├── .env.local                    # 本地环境变量 (需自行创建)
├── index.html
├── package.json
├── vite.config.ts                # Vite 配置 (含 API 代理)
├── tailwind.config.js
└── tsconfig.json
```

## 常见问题

### Q: 无法连接到 Ollama？

确保 Ollama 服务正在运行：
```bash
ollama serve
```

### Q: 补全速度太慢？

- 使用更小的模型 (如 `qwen2.5-coder:1.5b`)
- 减少最大补全长度
- 确保有足够的 GPU/内存资源

### Q: 如何使用其他模型？

1. 先下载模型: `ollama pull <model-name>`
2. 在设置面板的模型选择器中选择新模型

## License

MIT
