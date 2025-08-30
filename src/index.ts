/**
 * @bagaking/dma-frame
 * Elegant, unified API for document mini-app frame control
 * 基于第一性原理的文档小组件高度管理
 * 
 * @version 0.1.0
 * @author bagaking <bagaking@gmail.com>
 * @license MIT
 */

// === Internal Imports ===
import { CoreHeightController } from './HeightController.js';
import { FeishuPlatformBridge } from './FeishuBridge.js';
import { PlatformBridgeError, isModuleImportError } from './types.js';
import type { 
  HeightController, 
  PlatformBridge, 
  PlatformFactoryOptions 
} from './types.js';

// === Core Exports ===
export { CoreHeightController } from './HeightController.js';
export { FeishuPlatformBridge } from './FeishuBridge.js';

// === Type Exports ===
export type {
  HeightController,
  PlatformBridge,
  HeightAdjustmentBehavior,
  HeightControllerFactory,
  PlatformFactoryOptions,
  // Legacy compatibility
  HeightAdjustmentBehavior as HeightBehavior
} from './types.js';

// === Error Exports ===
export {
  DMAppFrameError,
  PlatformBridgeError,
  HeightControllerError
} from './types.js';

// === Legacy Compatibility ===
/**
 * Legacy alias for CoreHeightController
 * 与原 AddOnFrameController 兼容
 */
export { CoreHeightController as LegacyHeightController } from './HeightController.js';

// === Factory Functions ===

/**
 * Creates a Feishu platform bridge for document addon integration
 * 创建飞书平台桥接器，用于文档插件集成
 * 
 * @param options - Platform factory options
 * @param options.debug - Enable debug logging
 * @returns Promise resolving to a PlatformBridge instance
 * @throws {PlatformBridgeError} When Feishu API is not available or initialization fails
 * 
 * @example
 * ```typescript
 * const bridge = await createFeishuBridge({ debug: true });
 * const controller = new CoreHeightController(bridge);
 * ```
 * 
 * @remarks
 * Important: Feishu docs addon currently doesn't support dynamic height adjustment API.
 * Height is statically set through the `initialHeight` field in app.json.
 * This bridge provides compatibility layer for consistent API usage.
 */
export async function createFeishuBridge(options: PlatformFactoryOptions = {}): Promise<PlatformBridge> {
  const { debug = false } = options;

  if (debug) {
    console.log('[DMAppFrame] Creating Feishu docs addon bridge...');
  }

  try {
    // 导入BlockitClient并创建DocMiniApp实例
    const { BlockitClient } = await import('@lark-opdev/block-docs-addon-api');
    const docMiniApp = new BlockitClient().initAPI();
    
    if (debug) {
      console.log('[DMAppFrame] Successfully created DocMiniApp from BlockitClient');
      console.log('[DMAppFrame] DocMiniApp Bridge available:', !!docMiniApp.Bridge?.updateHeight);
    }
    
    return new FeishuPlatformBridge(docMiniApp, debug);
  } catch (error) {
    // 精确的异常处理策略：区分不同错误类型
    if (isModuleImportError(error)) {
      // 模块加载失败的预期处理（优雅降级）
      if (debug) {
        console.warn('[DMAppFrame] Feishu docs addon API unavailable, using mock bridge:', 
          error instanceof Error ? error.message : error);
      }
      
      const mockDocMiniApp = {};
      return new FeishuPlatformBridge(mockDocMiniApp, debug);
    } else {
      // 其他运行时错误应该向上抛出
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new PlatformBridgeError(
        `Failed to initialize Feishu bridge: ${errorMessage}`,
        'feishu'
      );
    }
  }
}

/**
 * Creates a complete Feishu height controller (most commonly used)
 * 创建完整的飞书高度控制器（最常用的方法）
 * 
 * @param options - Platform factory options
 * @param options.debug - Enable debug logging for development
 * @param options.platformId - Custom platform identifier
 * @returns Promise resolving to a HeightController instance
 * @throws {PlatformBridgeError} When controller creation fails
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const controller = await createFeishuHeightController();
 * 
 * // With debug enabled
 * const controller = await createFeishuHeightController({ debug: true });
 * 
 * // Adjust height with intelligent timing
 * await controller.adjustHeight({
 *   targetHeight: 600,
 *   onUIChange: () => setHeight(600),
 *   onUIComplete: async () => await animateContent()
 * });
 * ```
 */
export async function createFeishuHeightController(
  options: PlatformFactoryOptions = {}
): Promise<HeightController> {
  const { debug = false } = options;
  
  try {
    const bridge = await createFeishuBridge({ debug });
    return new CoreHeightController(bridge, debug) as HeightController;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new PlatformBridgeError(
      `Failed to create Feishu height controller: ${errorMessage}`,
      'feishu'
    );
  }
}

/**
 * Creates a mock platform bridge for testing purposes
 * 创建模拟平台桥接器，用于测试
 * 
 * @param options - Platform factory options
 * @param options.debug - Enable debug logging
 * @param options.platformId - Custom platform identifier for logs
 * @returns A PlatformBridge instance that simulates platform behavior
 * 
 * @example
 * ```typescript
 * const mockBridge = createMockBridge({ debug: true, platformId: 'test-env' });
 * const controller = new CoreHeightController(mockBridge);
 * 
 * // Use in tests
 * await controller.adjustHeight({ targetHeight: 400 });
 * ```
 */
export function createMockBridge(options: PlatformFactoryOptions = {}): PlatformBridge {
  const { debug = false, platformId = 'mock' } = options;
  
  return {
    async updateHeight(targetHeight: number): Promise<number> {
      if (debug) {
        console.log(`[MockBridge-${platformId}] Setting height to ${targetHeight}px`);
      }
      
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 10));
      return targetHeight;
    }
  };
}

/**
 * Creates a mock height controller for testing purposes
 * 创建模拟高度控制器，用于测试
 * 
 * @param options - Platform factory options
 * @param options.debug - Enable debug logging for test visibility
 * @param options.platformId - Custom platform identifier
 * @returns A HeightController instance with mocked platform integration
 * 
 * @example
 * ```typescript
 * // In Jest tests
 * const mockController = createMockHeightController({ debug: true });
 * 
 * let uiHeight = 0;
 * await mockController.adjustHeight({
 *   targetHeight: 500,
 *   onUIChange: () => { uiHeight = 500; }
 * });
 * 
 * expect(uiHeight).toBe(500);
 * ```
 */
export function createMockHeightController(options: PlatformFactoryOptions = {}): HeightController {
  const { debug = false } = options;
  const mockBridge = createMockBridge(options);
  return new CoreHeightController(mockBridge, debug);
}

// === Clean Architecture Implementation ===

// === Default Export (Most Common Usage) ===

/**
 * Default export: createFeishuHeightController
 * 默认导出：createFeishuHeightController - 最常用的快速创建方式
 * 
 * @example
 * ```typescript
 * // ES6 default import
 * import createController from '@bagaking/dma-frame';
 * const controller = await createController();
 * 
 * // CommonJS
 * const createController = require('@bagaking/dma-frame').default;
 * 
 * // Usage
 * await controller.adjustHeight({ targetHeight: 500 });
 * ```
 */
export default createFeishuHeightController;