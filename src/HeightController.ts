/**
 * DMAppFrame - Core Height Controller
 * Intelligent height management with timing strategies
 */

import type { 
  HeightController, 
  HeightAdjustmentBehavior, 
  PlatformBridge
} from './types.js';
import { 
  HeightControllerError,
  generateDebugId,
  FRAMEWORK_CONSTANTS,
  isReasonableHeight
} from './types.js';

/**
 * Core height controller implementation
 * 核心高度控制器：基于第一性原理，提供极简接口和完整内部系统
 * 
 * Key Features:
 * - 单一接口：只有 adjustHeight(behavior) 一个方法
 * - 串行化队列：严格按顺序执行，避免竞态条件
 * - 智能时序：扩展/收缩采用不同的时序策略
 * - 容错机制：失败时保证UI状态一致
 */
export class CoreHeightController implements HeightController {
  private currentHeight = 0;
  private behaviorQueue: HeightAdjustmentBehavior[] = [];
  private executing = false;
  private _isDisposed = false;
  private readonly debugId = generateDebugId('HeightController');

  constructor(
    private readonly bridge: PlatformBridge,
    private readonly debug = false
  ) {
    if (this.debug) {
      console.log(`[${this.debugId}] Initialized with platform bridge`);
    }
  }

  /**
   * 唯一公共接口：调整高度
   * 传入一个原子行为，自动处理时序和串行化
   * 
   * @param behavior - Height adjustment configuration
   * @param behavior.targetHeight - Target height in pixels (must be > 0)
   * @param behavior.onUIChange - Called when UI should update (optional)
   * @param behavior.onUIComplete - Called when adjustment completes (optional)
   * 
   * @throws {HeightControllerError} When controller is disposed or parameters are invalid
   * 
   * @example
   * ```typescript
   * await controller.adjustHeight({
   *   targetHeight: 600,
   *   onUIChange: () => setHeight(600),
   *   onUIComplete: async () => await animateContent()
   * });
   * ```
   */
  async adjustHeight(behavior: HeightAdjustmentBehavior): Promise<void> {
    this.ensureNotDisposed();
    this.validateHeightBehavior(behavior);

    if (this.debug) {
      console.log(`[${this.debugId}] Queueing height adjustment to ${behavior.targetHeight}px`);
    }

    // 加入队列
    this.behaviorQueue.push(behavior);
    
    // 如果没有在执行，开始处理
    if (!this.executing) {
      await this.processQueue();
    }
  }

  /**
   * 串行化处理队列
   * 第一性原理：严格按顺序执行，避免并发冲突
   */
  private async processQueue(): Promise<void> {
    this.executing = true;
    
    while (this.behaviorQueue.length > 0) {
      const behavior = this.behaviorQueue.shift()!;
      
      if (this.debug) {
        console.log(`[${this.debugId}] Processing height adjustment: ${this.currentHeight}px → ${behavior.targetHeight}px`);
      }
      
      try {
        // 自动识别扩展还是收缩
        const isExpanding = behavior.targetHeight > this.currentHeight;
        
        if (isExpanding) {
          // 扩展：组件先变，UI后填
          await this.bridge.updateHeight(behavior.targetHeight);
          if (behavior.onUIChange) {
            behavior.onUIChange();
          }
          if (behavior.onUIComplete) {
            await behavior.onUIComplete();
          }
        } else {
          // 收缩：UI先变，组件后随
          if (behavior.onUIChange) {
            behavior.onUIChange();
          }
          if (behavior.onUIComplete) {
            await behavior.onUIComplete();
          }
          await this.bridge.updateHeight(behavior.targetHeight);
        }
        
        // 更新当前高度
        this.currentHeight = behavior.targetHeight;
        
        if (this.debug) {
          console.log(`[${this.debugId}] Height adjustment completed: ${this.currentHeight}px`);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (this.debug) {
          console.error(`[${this.debugId}] Height adjustment failed:`, errorMessage);
        }
        
        // 容错：确保UI状态正确（第一性原理：不回滚已展示的界面）
        if (behavior.onUIChange) {
          behavior.onUIChange();
        }
        this.currentHeight = behavior.targetHeight;
        
        // 继续处理队列，不因单个失败而中断
      }
    }
    
    this.executing = false;
  }

  /**
   * 获取当前高度（调试用）
   */
  getCurrentHeight(): number {
    return this.currentHeight;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    if (this.debug) {
      console.log(`[${this.debugId}] Disposing controller`);
    }

    this.behaviorQueue.length = 0;
    this.executing = false;
    this._isDisposed = true;
  }

  /**
   * Check if controller is disposed
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Ensure controller is not disposed before operations
   */
  private ensureNotDisposed(): void {
    if (this._isDisposed) {
      throw new HeightControllerError('Controller has been disposed');
    }
  }

  /**
   * 严格验证高度行为参数
   * 基于第一性原理：确保所有输入都是安全和有效的
   */
  private validateHeightBehavior(behavior: HeightAdjustmentBehavior): void {
    // 验证行为对象本身
    if (!behavior || typeof behavior !== 'object') {
      throw new HeightControllerError(
        'Invalid behavior: Expected a valid HeightAdjustmentBehavior object'
      );
    }

    // 验证目标高度
    const { targetHeight } = behavior;
    if (typeof targetHeight !== 'number') {
      throw new HeightControllerError(
        `Invalid targetHeight: Expected number, got ${typeof targetHeight}`
      );
    }

    if (!Number.isFinite(targetHeight)) {
      throw new HeightControllerError(
        `Invalid targetHeight: ${targetHeight}. Must be a finite number`
      );
    }

    if (targetHeight < FRAMEWORK_CONSTANTS.MIN_REASONABLE_HEIGHT) {
      throw new HeightControllerError(
        `Invalid targetHeight: ${targetHeight}. Must be at least ${FRAMEWORK_CONSTANTS.MIN_REASONABLE_HEIGHT}px`
      );
    }

    // 业务逻辑边界：使用统一的合理高度检查
    if (!isReasonableHeight(targetHeight)) {
      throw new HeightControllerError(
        `Invalid targetHeight: ${targetHeight}. Must be within reasonable range (${FRAMEWORK_CONSTANTS.MIN_REASONABLE_HEIGHT}-${FRAMEWORK_CONSTANTS.MAX_REASONABLE_HEIGHT}px)`
      );
    }

    // 验证可选回调函数
    const { onUIChange, onUIComplete } = behavior;
    if (onUIChange !== undefined && typeof onUIChange !== 'function') {
      throw new HeightControllerError(
        `Invalid onUIChange: Expected function or undefined, got ${typeof onUIChange}`
      );
    }

    if (onUIComplete !== undefined && typeof onUIComplete !== 'function') {
      throw new HeightControllerError(
        `Invalid onUIComplete: Expected function or undefined, got ${typeof onUIComplete}`
      );
    }
  }
}