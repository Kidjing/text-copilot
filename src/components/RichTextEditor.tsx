import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { GhostTextExtension } from '../extensions';
import type { FIMContext } from '../types';

/**
 * 智能构建补全上下文
 * 核心策略：只提取当前行/当前句子，避免无关内容干扰模型
 * 
 * 为什么只取当前行？
 * - 用户正在输入的内容（当前行）才是真正需要续写的目标
 * - 上文的其他段落可能是完全不相关的话题
 * - 模型如果看到多个话题，可能会随机选择一个续写
 */
const buildSmartContext = (text: string, cursorPos: number): string => {
  const beforeCursor = text.slice(0, cursorPos);

  // 找到当前行的开始位置（最后一个换行符之后）
  const lastNewlineIdx = beforeCursor.lastIndexOf('\n');
  
  // 提取当前行
  const currentLine = lastNewlineIdx >= 0 
    ? beforeCursor.slice(lastNewlineIdx + 1) 
    : beforeCursor;

  // 如果当前行有内容，只返回当前行
  if (currentLine.trim().length > 0) {
    return currentLine;
  }

  // 如果当前行是空的，尝试找到最近的非空行
  const lines = beforeCursor.split('\n').filter(l => l.trim());
  if (lines.length > 0) {
    return lines[lines.length - 1];
  }

  // 实在没有内容，返回光标前的文本
  return beforeCursor;
};

interface RichTextEditorProps {
  /** 初始值 */
  defaultValue?: string;
  /** 补全请求函数，接收 FIMContext（包含 prefix 和 suffix） */
  onCompletionRequest: (context: FIMContext) => Promise<string>;
  /** 是否正在加载补全 */
  isLoading?: boolean;
  /** 防抖延迟（毫秒） */
  debounceMs?: number;
  /** 值变化回调 */
  onValueChange?: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
}

/**
 * 富文本编辑器组件
 * 使用 TipTap 编辑器 + 自定义幽灵文本扩展实现 AI 补全
 */
const RichTextEditor = ({
  defaultValue = '',
  onCompletionRequest,
  isLoading = false,
  debounceMs = 500,
  onValueChange,
  placeholder = '在这里输入文字，AI 会自动提供补全建议...',
}: RichTextEditorProps) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [hasCompletion, setHasCompletion] = useState(false);
  
  // 防抖定时器
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 上一次请求的上下文（用于去重）
  const lastContextRef = useRef<string>('');
  // 当前补全文本
  const currentCompletionRef = useRef<string>('');
  // 补全位置
  const completionPositionRef = useRef<number>(0);

  // 实际的加载状态
  const actualLoading = isLoading || internalLoading;

  // 初始化 TipTap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用代码块，简化为纯文本编辑
        codeBlock: false,
        // 保留基本的文本格式
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      GhostTextExtension.configure({
        className: 'ghost-text',
      }),
    ],
    content: defaultValue ? `<p>${defaultValue.replace(/\n/g, '</p><p>')}</p>` : '',
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
      },
      // 处理键盘事件
      handleKeyDown: (_view, event) => {
        // Tab 键处理
        if (event.key === 'Tab') {
          event.preventDefault();
          
          if (currentCompletionRef.current) {
            // 采纳补全
            const { commands } = editor!;
            commands.acceptGhostText();
            currentCompletionRef.current = '';
            completionPositionRef.current = 0;
            setHasCompletion(false);
            return true;
          } else {
            // 没有补全时，插入两个空格
            editor?.commands.insertContent('  ');
            return true;
          }
        }

        // Escape 键处理
        if (event.key === 'Escape') {
          if (currentCompletionRef.current) {
            // 清除补全
            editor?.commands.clearGhostText();
            currentCompletionRef.current = '';
            completionPositionRef.current = 0;
            setHasCompletion(false);
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // 内容变化时清除补全
      if (currentCompletionRef.current) {
        editor.commands.clearGhostText();
        currentCompletionRef.current = '';
        completionPositionRef.current = 0;
        setHasCompletion(false);
      }

      // 清除之前的定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 通知外部内容变化
      const text = editor.getText();
      onValueChange?.(text);

      // 设置防抖定时器触发补全
      debounceTimerRef.current = setTimeout(() => {
        triggerCompletionRequest();
      }, debounceMs);
    },
    onSelectionUpdate: ({ editor }) => {
      // 光标位置变化时，如果不在补全位置，清除幽灵文本
      if (currentCompletionRef.current) {
        const currentPos = editor.state.selection.from;
        // 如果光标位置与补全显示位置不同，清除补全
        if (currentPos !== completionPositionRef.current) {
          editor.commands.clearGhostText();
          currentCompletionRef.current = '';
          completionPositionRef.current = 0;
          setHasCompletion(false);
        }
      }
    },
    autofocus: 'end',
  });

  /**
   * 触发补全请求
   */
  const triggerCompletionRequest = useCallback(async () => {
    if (!editor) return;

    // 获取光标前的文本作为上下文
    const { from } = editor.state.selection;
    
    // 直接从 ProseMirror 文档中提取光标前后的文本
    const textBeforeCursor = editor.state.doc.textBetween(0, from, '\n');
    const docLength = editor.state.doc.content.size;
    const textAfterCursor = editor.state.doc.textBetween(from, docLength, '\n');
    
    // prefix 是光标前的完整内容（不截断）
    const prefix = textBeforeCursor;
    // suffix 是光标后的内容
    const suffix = textAfterCursor;

    // 使用智能上下文判断是否需要请求（只用于去重判断，不影响实际传递的内容）
    const currentLineContext = buildSmartContext(textBeforeCursor, textBeforeCursor.length);

    // 如果当前行上下文太短或与上次相同，不请求
    if (currentLineContext.trim().length < 3) return;
    if (currentLineContext === lastContextRef.current) return;

    lastContextRef.current = currentLineContext;
    setInternalLoading(true);
    setHasCompletion(false);

    try {
      const completion = await onCompletionRequest({ prefix, suffix });

      if (completion && completion.trim() && editor) {
        // 检查光标位置是否变化
        const currentFrom = editor.state.selection.from;
        if (currentFrom === from) {
          // 存储补全结果并显示幽灵文本
          currentCompletionRef.current = completion;
          completionPositionRef.current = from;
          editor.commands.setGhostText(completion, from);
          setHasCompletion(true);
        }
      }
    } catch (error) {
      // 忽略取消错误
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Canceled'))) {
        console.log('[Completion] Request canceled');
        return;
      }
      console.error('[Completion] Request failed:', error);
    } finally {
      setInternalLoading(false);
    }
  }, [editor, onCompletionRequest]);

  // 自动聚焦
  useEffect(() => {
    if (editor) {
      editor.commands.focus('end');
    }
  }, [editor]);

  // 清理
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="rich-text-editor-wrapper">
      {/* 加载指示器 */}
      {actualLoading && (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-md bg-gray-800/90 px-3 py-1.5 text-sm text-gray-300 shadow-lg border border-gray-700">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span>生成中...</span>
        </div>
      )}

      {/* 幽灵文本提示 */}
      {hasCompletion && !actualLoading && (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-3 rounded-md bg-green-900/90 px-3 py-1.5 text-sm shadow-lg border border-green-700">
          <span className="text-green-300 font-medium">✨ 补全就绪</span>
          <span className="text-green-200">
            <kbd className="rounded bg-green-800 px-1.5 py-0.5 text-xs font-mono border border-green-600">Tab</kbd>
            {' '}采纳
          </span>
          <span className="text-green-200">
            <kbd className="rounded bg-green-800 px-1.5 py-0.5 text-xs font-mono border border-green-600">Esc</kbd>
            {' '}取消
          </span>
        </div>
      )}

      {/* TipTap 编辑器 */}
      <EditorContent editor={editor} className="h-full" />

      {/* 编辑器样式 */}
      <style>{`
        .rich-text-editor-wrapper {
          position: relative;
          height: 100%;
          width: 100%;
          background-color: #1e1e1e;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .rich-text-editor-wrapper .ProseMirror {
          height: 100%;
          padding: 1rem;
          outline: none;
          font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 15px;
          line-height: 1.75;
          color: #d4d4d4;
          caret-color: #fff;
          overflow-y: auto;
        }

        .rich-text-editor-wrapper .ProseMirror p {
          margin: 0 0 0.5em 0;
        }

        .rich-text-editor-wrapper .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        /* 占位符样式 */
        .rich-text-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #6b7280;
          pointer-events: none;
          height: 0;
        }

        /* 幽灵文本样式 */
        .ghost-text {
          color: #6b7280;
          opacity: 0.7;
          font-style: italic;
          pointer-events: none;
          user-select: none;
          white-space: pre-wrap;
        }

        /* 选中文本样式 */
        .rich-text-editor-wrapper .ProseMirror ::selection {
          background-color: #264f78;
        }

        /* 滚动条样式 */
        .rich-text-editor-wrapper .ProseMirror::-webkit-scrollbar {
          width: 8px;
        }

        .rich-text-editor-wrapper .ProseMirror::-webkit-scrollbar-track {
          background: #2d2d2d;
        }

        .rich-text-editor-wrapper .ProseMirror::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 4px;
        }

        .rich-text-editor-wrapper .ProseMirror::-webkit-scrollbar-thumb:hover {
          background: #666;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
