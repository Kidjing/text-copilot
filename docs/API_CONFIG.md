# API 配置指南

本项目支持两种 AI API 提供商：Ollama（本地运行）和 OpenAI API（云端服务）。

## 配置方式

### 1. 使用 Ollama（推荐用于开发和测试）

**优点**：
- 完全免费
- 数据隐私（本地运行）
- 无需网络连接
- 支持多种开源模型

**配置步骤**：

1. 安装并启动 Ollama：
```bash
# 安装 Ollama
brew install ollama  # macOS
# 或访问 https://ollama.ai 下载

# 下载模型
ollama pull qwen2.5-coder:1.5b

# 启动服务
ollama serve
```

2. 创建 `.env.local` 文件（可选，使用默认配置即可）：
```bash
VITE_AI_PROVIDER=ollama
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=qwen2.5-coder:1.5b
```

3. 启动项目：
```bash
npm run dev
```

### 2. 使用 OpenAI API

**优点**：
- 模型质量高
- 无需本地资源
- 支持最新的 GPT 模型

**配置步骤**：

1. 获取 OpenAI API Key：
   - 访问 https://platform.openai.com/api-keys
   - 创建新的 API Key

2. 创建 `.env.local` 文件：
```bash
VITE_AI_PROVIDER=openai
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_API_KEY=sk-your-api-key-here
VITE_OPENAI_MODEL=gpt-3.5-turbo
```

3. 启动项目：
```bash
npm run dev
```

### 3. 使用兼容 OpenAI API 的第三方服务

许多服务提供兼容 OpenAI API 的接口，例如：

#### Azure OpenAI

```bash
VITE_AI_PROVIDER=openai
VITE_OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
VITE_OPENAI_API_KEY=your-azure-api-key
VITE_OPENAI_MODEL=gpt-35-turbo
```

#### 本地部署的模型（使用 vLLM、LocalAI 等）

```bash
VITE_AI_PROVIDER=openai
VITE_OPENAI_BASE_URL=http://localhost:8000/v1
VITE_OPENAI_API_KEY=dummy-key  # 某些本地服务不需要真实的 key
VITE_OPENAI_MODEL=your-model-name
```

## 配置文件说明

### config.env.yaml

这是默认配置文件，包含所有配置项的说明和默认值。你可以直接修改此文件，但不推荐（因为会影响版本控制）。

### .env.local

这是本地环境变量文件，优先级高于 `config.env.yaml`。推荐使用此文件进行配置：

1. 复制 `.env.example` 为 `.env.local`
2. 修改 `.env.local` 中的配置
3. `.env.local` 不会被提交到 Git（已在 .gitignore 中）

## 环境变量完整列表

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_AI_PROVIDER` | API 提供商 (`ollama` 或 `openai`) | `ollama` |
| `VITE_OLLAMA_BASE_URL` | Ollama 服务地址 | `http://localhost:11434` |
| `VITE_OLLAMA_MODEL` | Ollama 模型名称 | `qwen2.5-coder:1.5b` |
| `VITE_OPENAI_BASE_URL` | OpenAI API 地址 | `https://api.openai.com/v1` |
| `VITE_OPENAI_API_KEY` | OpenAI API Key | (空) |
| `VITE_OPENAI_MODEL` | OpenAI 模型名称 | `gpt-3.5-turbo` |

## 推荐模型

### Ollama 模型

| 模型 | 大小 | 速度 | 质量 | 适用场景 |
|------|------|------|------|----------|
| `qwen2.5-coder:1.5b` | 1.5B | ⚡⚡⚡ | ⭐⭐⭐ | 快速补全，资源受限 |
| `qwen2.5-coder:7b` | 7B | ⚡⚡ | ⭐⭐⭐⭐ | 平衡性能和质量 |
| `codellama:7b` | 7B | ⚡⚡ | ⭐⭐⭐⭐ | 代码生成 |
| `deepseek-coder:6.7b` | 6.7B | ⚡⚡ | ⭐⭐⭐⭐ | 代码理解 |

### OpenAI 模型

| 模型 | 速度 | 质量 | 成本 | 适用场景 |
|------|------|------|------|----------|
| `gpt-3.5-turbo` | ⚡⚡⚡ | ⭐⭐⭐⭐ | $ | 日常使用 |
| `gpt-4` | ⚡ | ⭐⭐⭐⭐⭐ | $$$ | 高质量需求 |
| `gpt-4-turbo` | ⚡⚡ | ⭐⭐⭐⭐⭐ | $$ | 平衡性能和质量 |

## 故障排查

### Ollama 连接失败

1. 确认 Ollama 服务正在运行：
```bash
ollama serve
```

2. 检查端口是否被占用：
```bash
lsof -i :11434
```

3. 确认模型已下载：
```bash
ollama list
```

### OpenAI API 错误

1. 检查 API Key 是否正确
2. 确认账户有足够的额度
3. 检查网络连接
4. 查看浏览器控制台的错误信息

### 补全速度慢

1. **Ollama**：
   - 使用更小的模型
   - 减少 `maxTokens` 配置
   - 确保有足够的 GPU/内存

2. **OpenAI**：
   - 检查网络延迟
   - 使用更快的模型（如 `gpt-3.5-turbo`）

## 安全建议

1. **不要提交 API Key**：确保 `.env.local` 在 `.gitignore` 中
2. **使用环境变量**：不要在代码中硬编码 API Key
3. **限制 API Key 权限**：在 OpenAI 控制台设置使用限制
4. **定期轮换 Key**：定期更新 API Key

## 高级配置

### 自定义补全参数

在代码中使用 `useAICompletion` Hook 时，可以传入自定义配置：

```typescript
const { requestCompletion } = useAICompletion({
  config: {
    temperature: 0.3,      // 提高创造性
    maxTokens: 128,        // 增加补全长度
    debounceMs: 300,       // 减少触发延迟
  },
});
```

### 动态切换 API 提供商

目前需要修改环境变量并重启服务。未来版本将支持运行时切换。
