/**
 * DMAppFrame - Feishu Platform Bridge (Docs Addon Version)
 * 飞书文档插件桥接器实现
 * 
 * 重要说明：飞书文档插件 (docs-addon) 不支持动态高度调整API
 * 高度通过 app.json 中的 initialHeight 字段静态设置
 */

import type { PlatformBridge } from './types.js';
import { PlatformBridgeError, generateDebugId } from './types.js';

/**
 * 飞书文档插件桥接器
 * 为保持接口兼容性，提供模拟实现
 */
export class FeishuPlatformBridge implements PlatformBridge {
  private readonly debugId = generateDebugId('FeishuDocsAddonBridge');

  constructor(
    private readonly docMiniApp: any, // DocMiniApp from @lark-opdev/block-docs-addon-api
    private readonly debug = false
  ) {
    // 文档插件不需要检查 Bridge.updateHeight API，因为它不存在
    if (this.debug) {
      console.log(`[${this.debugId}] Feishu docs addon bridge initialized`);
      console.warn(`[${this.debugId}] 文档插件不支持动态高度调整，高度由 app.json initialHeight 决定`);
    }
  }

  /**
   * 更新组件高度 - 调用DocMiniApp Bridge API
   */
  async updateHeight(targetHeight: number): Promise<number> {
    if (targetHeight <= 0) {
      throw new PlatformBridgeError(
        `Invalid height: ${targetHeight}. Must be positive.`,
        'feishu'
      );
    }

    if (this.debug) {
      console.log(`[${this.debugId}] 更新高度到 ${targetHeight}px`);
    }

    try {
      // 检查Bridge API是否可用
      if (!this.docMiniApp.Bridge?.updateHeight) {
        if (this.debug) {
          console.warn(`[${this.debugId}] DocMiniApp.Bridge.updateHeight not available, using fallback`);
        }
        return targetHeight; // 降级处理
      }

      // 调用真实的Bridge API
      await this.docMiniApp.Bridge.updateHeight(targetHeight);
      
      if (this.debug) {
        console.log(`[${this.debugId}] ✅ 高度更新成功: ${targetHeight}px`);
      }
      
      return targetHeight;
    } catch (error) {
      if (this.debug) {
        console.error(`[${this.debugId}] ❌ 高度更新失败:`, error);
      }
      throw new PlatformBridgeError(
        `Failed to update height to ${targetHeight}px: ${error}`,
        'feishu'
      );
    }
  }
}