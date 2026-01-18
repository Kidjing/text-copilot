import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * 幽灵文本扩展的存储类型
 */
export interface GhostTextStorage {
  /** 当前的幽灵文本内容 */
  ghostText: string;
  /** 幽灵文本显示的位置 */
  position: number;
}

/**
 * 幽灵文本扩展配置
 */
export interface GhostTextOptions {
  /** 幽灵文本的 CSS 类名 */
  className: string;
}

// 定义 Plugin Key，用于访问插件状态
export const ghostTextPluginKey = new PluginKey<DecorationSet>('ghostText');

/**
 * 声明扩展命令
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ghostText: {
      /**
       * 设置幽灵文本
       * @param text 幽灵文本内容
       * @param position 显示位置（如果不指定则使用当前光标位置）
       */
      setGhostText: (text: string, position?: number) => ReturnType;
      /**
       * 清除幽灵文本
       */
      clearGhostText: () => ReturnType;
      /**
       * 采纳幽灵文本（将其插入到编辑器中）
       */
      acceptGhostText: () => ReturnType;
    };
  }
}

/**
 * TipTap 幽灵文本扩展
 * 用于在编辑器中显示 AI 补全建议的半透明预览文本
 */
export const GhostTextExtension = Extension.create<GhostTextOptions, GhostTextStorage>({
  name: 'ghostText',

  addOptions() {
    return {
      className: 'ghost-text',
    };
  },

  addStorage() {
    return {
      ghostText: '',
      position: 0,
    };
  },

  addCommands() {
    return {
      setGhostText:
        (text: string, position?: number) =>
        ({ editor, tr }) => {
          const pos = position ?? editor.state.selection.from;
          this.storage.ghostText = text;
          this.storage.position = pos;
          
          // 触发视图更新
          editor.view.dispatch(tr);
          return true;
        },

      clearGhostText:
        () =>
        ({ editor, tr }) => {
          this.storage.ghostText = '';
          this.storage.position = 0;
          
          // 触发视图更新
          editor.view.dispatch(tr);
          return true;
        },

      acceptGhostText:
        () =>
        ({ chain }) => {
          const ghostText = this.storage.ghostText;
          const position = this.storage.position;

          if (!ghostText) {
            return false;
          }

          // 清除幽灵文本
          this.storage.ghostText = '';
          this.storage.position = 0;

          // 在指定位置插入文本
          return chain()
            .focus()
            .insertContentAt(position, ghostText)
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    const { className } = this.options;

    return [
      new Plugin({
        key: ghostTextPluginKey,
        
        props: {
          decorations: (state) => {
            const { ghostText, position } = extension.storage;
            
            if (!ghostText || position <= 0) {
              return DecorationSet.empty;
            }

            // 验证位置是否有效
            if (position > state.doc.content.size) {
              return DecorationSet.empty;
            }

            // 创建一个 widget decoration 来显示幽灵文本
            const widget = Decoration.widget(position, () => {
              const span = document.createElement('span');
              span.className = className;
              span.textContent = ghostText;
              return span;
            }, {
              side: 1, // 放在光标后面
              key: 'ghost-text-widget',
            });

            return DecorationSet.create(state.doc, [widget]);
          },
        },
      }),
    ];
  },
});

export default GhostTextExtension;
