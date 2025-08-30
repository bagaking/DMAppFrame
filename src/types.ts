/**
 * DMAppFrame - Core Types
 * Elegant type definitions for document mini-app frame control
 */

/**
 * Height adjustment behavior configuration
 */
export interface HeightAdjustmentBehavior {
  /** Target height in pixels */
  readonly targetHeight: number;
  
  /** UI change callback - called when UI state should be updated */
  readonly onUIChange?: () => void | Promise<void>;
  
  /** Completion callback - called when the adjustment is fully complete */
  readonly onUIComplete?: () => void | Promise<void>;
}

/**
 * Platform-specific bridge interface
 * Compatible with original AddOnFrameController API
 */
export interface PlatformBridge {
  /** Update the actual frame height via platform API */
  updateHeight(targetHeight: number): Promise<number>;
}

/**
 * Core height controller interface  
 */
export interface HeightController {
  /**
   * Adjust height with intelligent timing control
   */
  adjustHeight(behavior: HeightAdjustmentBehavior): Promise<void>;
  
  /** Dispose resources and clean up */
  dispose(): void;
  
  /** Get controller status for debugging */
  readonly isDisposed: boolean;
}

/**
 * Factory function type for creating height controllers
 */
export type HeightControllerFactory<T extends HeightController = HeightController> = () => Promise<T>;

/**
 * Platform-specific factory options
 */
export interface PlatformFactoryOptions {
  /** Enable debug logging */
  debug?: boolean;
  
  /** Custom platform identifier */
  platformId?: string;
  
  /** Additional platform-specific options */
  [key: string]: unknown;
}

/**
 * Error types for better error handling
 */
export class DMAppFrameError extends Error {
  constructor(
    message: string, 
    public readonly code: string,
    public readonly platform?: string
  ) {
    super(message);
    this.name = 'DMAppFrameError';
  }
}

export class PlatformBridgeError extends DMAppFrameError {
  constructor(message: string, platform: string) {
    super(message, 'PLATFORM_BRIDGE_ERROR', platform);
    this.name = 'PlatformBridgeError';
  }
}

export class HeightControllerError extends DMAppFrameError {
  constructor(message: string, platform?: string) {
    super(message, 'HEIGHT_CONTROLLER_ERROR', platform);
    this.name = 'HeightControllerError';
  }
}

// Legacy compatibility
export type { HeightAdjustmentBehavior as HeightBehavior };

/**
 * Framework constants and utilities
 */
export const FRAMEWORK_CONSTANTS = {
  /** Maximum reasonable height for UI components (prevents extreme values) */
  MAX_REASONABLE_HEIGHT: 10000,
  /** Minimum valid height for UI components */
  MIN_REASONABLE_HEIGHT: 1,
  /** Debug ID entropy for uniqueness */
  DEBUG_ID_ENTROPY_LENGTH: 8,
} as const;

/**
 * Generate unique debug identifier for component instances
 * 统一调试ID生成：时间戳 + 随机熵，确保唯一性
 * 
 * @param prefix - Component prefix for identification
 * @returns Unique debug identifier string
 * 
 * @example
 * ```typescript
 * const debugId = generateDebugId('HeightController');
 * // Returns: "HeightController-1693934567890-a1b2c3d4"
 * ```
 */
export function generateDebugId(prefix: string): string {
  const timestamp = Date.now();
  const entropy = Math.random()
    .toString(36)
    .slice(2, 2 + FRAMEWORK_CONSTANTS.DEBUG_ID_ENTROPY_LENGTH);
  
  return `${prefix}-${timestamp}-${entropy}`;
}

/**
 * 验证高度值是否在合理范围内
 * 基于业务逻辑的边界检查
 * 
 * @param height - Height value to validate
 * @returns true if height is within reasonable bounds
 */
export function isReasonableHeight(height: number): boolean {
  return height >= FRAMEWORK_CONSTANTS.MIN_REASONABLE_HEIGHT && 
         height <= FRAMEWORK_CONSTANTS.MAX_REASONABLE_HEIGHT;
}

/**
 * 检查错误是否为模块导入失败
 * 用于精确的异常处理：区分模块加载错误和其他运行时错误
 * 
 * @param error - Error object to check
 * @returns true if error is related to module import failure
 * 
 * @example
 * ```typescript
 * try {
 *   await import('@some-module/api');
 * } catch (error) {
 *   if (isModuleImportError(error)) {
 *     // Handle module not found gracefully
 *     useBackupImplementation();
 *   } else {
 *     // Re-throw other errors
 *     throw error;
 *   }
 * }
 * ```
 */
export function isModuleImportError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  // 检查常见的模块导入错误模式
  const importErrorPatterns = [
    /module.*not.*found/i,
    /cannot.*resolve.*module/i,
    /failed.*to.*resolve/i,
    /module.*does.*not.*exist/i,
    /cannot.*find.*module/i,
    /error.*resolving.*module/i
  ];

  const errorMessage = error.message;
  const errorName = error.name;

  // 检查错误名称
  if (['ModuleNotFoundError', 'ImportError', 'ResolveError'].includes(errorName)) {
    return true;
  }

  // 检查错误消息模式
  return importErrorPatterns.some(pattern => pattern.test(errorMessage));
}