/**
 * @bagaking/dma-frame - Core Height Controller Tests
 * 基于第一性原理的严格测试覆盖
 */

import { CoreHeightController } from '../src/HeightController.js';
import { HeightControllerError } from '../src/types.js';
import { PlatformBridge, HeightAdjustmentBehavior } from '../src/types.js';

// Mock platform bridge for testing
class MockPlatformBridge implements PlatformBridge {
  public calls: Array<{ method: string; args: any[] }> = [];
  public shouldFail = false;
  public delay = 0;

  async updateHeight(targetHeight: number): Promise<number> {
    this.calls.push({ method: 'updateHeight', args: [targetHeight] });
    
    if (this.shouldFail) {
      throw new Error('Mock bridge failure');
    }
    
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    return targetHeight;
  }

  reset(): void {
    this.calls = [];
    this.shouldFail = false;
    this.delay = 0;
  }
}

describe('CoreHeightController', () => {
  let mockBridge: MockPlatformBridge;
  let controller: CoreHeightController;

  beforeEach(() => {
    mockBridge = new MockPlatformBridge();
    controller = new CoreHeightController(mockBridge, false);
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('Constructor and Basic Properties', () => {
    test('should initialize with correct default values', () => {
      expect(controller.isDisposed).toBe(false);
      expect(controller.getCurrentHeight()).toBe(0);
    });

    test('should generate unique debug IDs', () => {
      const controller1 = new CoreHeightController(mockBridge);
      const controller2 = new CoreHeightController(mockBridge);
      
      // Debug IDs should be different (includes timestamp + entropy)
      expect((controller1 as any).debugId).not.toBe((controller2 as any).debugId);
      
      controller1.dispose();
      controller2.dispose();
    });
  });

  describe('Input Validation', () => {
    test('should reject null/undefined behavior', async () => {
      await expect(controller.adjustHeight(null as any))
        .rejects.toThrow(HeightControllerError);
      
      await expect(controller.adjustHeight(undefined as any))
        .rejects.toThrow(HeightControllerError);
    });

    test('should reject invalid targetHeight types', async () => {
      await expect(controller.adjustHeight({ targetHeight: 'invalid' as any }))
        .rejects.toThrow('Expected number');
      
      await expect(controller.adjustHeight({ targetHeight: null as any }))
        .rejects.toThrow('Expected number');
    });

    test('should reject non-finite targetHeight values', async () => {
      await expect(controller.adjustHeight({ targetHeight: Infinity }))
        .rejects.toThrow('Must be a finite number');
      
      await expect(controller.adjustHeight({ targetHeight: -Infinity }))
        .rejects.toThrow('Must be a finite number');
      
      await expect(controller.adjustHeight({ targetHeight: NaN }))
        .rejects.toThrow('Must be a finite number');
    });

    test('should reject targetHeight outside reasonable bounds', async () => {
      await expect(controller.adjustHeight({ targetHeight: 0 }))
        .rejects.toThrow('Must be at least 1px');
      
      await expect(controller.adjustHeight({ targetHeight: -100 }))
        .rejects.toThrow('Must be at least 1px');
      
      await expect(controller.adjustHeight({ targetHeight: 20000 }))
        .rejects.toThrow('Must be within reasonable range');
    });

    test('should reject invalid callback types', async () => {
      await expect(controller.adjustHeight({ 
        targetHeight: 400, 
        onUIChange: 'invalid' as any 
      })).rejects.toThrow('Expected function or undefined');
      
      await expect(controller.adjustHeight({ 
        targetHeight: 400, 
        onUIComplete: 123 as any 
      })).rejects.toThrow('Expected function or undefined');
    });
  });

  describe('Expansion Strategy (targetHeight > currentHeight)', () => {
    test('should call bridge first, then UI callbacks for expansion', async () => {
      const callOrder: string[] = [];
      
      await controller.adjustHeight({
        targetHeight: 600,
        onUIChange: () => { callOrder.push('onUIChange'); },
        onUIComplete: async () => { callOrder.push('onUIComplete'); }
      });

      expect(mockBridge.calls).toHaveLength(1);
      expect(mockBridge.calls[0]!.args[0]).toBe(600);
      expect(callOrder).toEqual(['onUIChange', 'onUIComplete']);
      expect(controller.getCurrentHeight()).toBe(600);
    });

    test('should handle expansion without callbacks', async () => {
      await controller.adjustHeight({ targetHeight: 500 });
      
      expect(mockBridge.calls).toHaveLength(1);
      expect(mockBridge.calls[0]!.args[0]).toBe(500);
      expect(controller.getCurrentHeight()).toBe(500);
    });
  });

  describe('Shrinking Strategy (targetHeight < currentHeight)', () => {
    test('should call UI callbacks first, then bridge for shrinking', async () => {
      // First set a higher height
      await controller.adjustHeight({ targetHeight: 800 });
      mockBridge.reset();
      
      const callOrder: string[] = [];
      
      await controller.adjustHeight({
        targetHeight: 400,
        onUIChange: () => { callOrder.push('onUIChange'); },
        onUIComplete: async () => { callOrder.push('onUIComplete'); }
      });

      expect(callOrder).toEqual(['onUIChange', 'onUIComplete']);
      expect(mockBridge.calls).toHaveLength(1);
      expect(mockBridge.calls[0]!.args[0]).toBe(400);
      expect(controller.getCurrentHeight()).toBe(400);
    });
  });

  describe('Serialized Queue Processing', () => {
    test('should process multiple adjustments in sequence', async () => {
      const heights = [300, 600, 450, 700];
      const promises = heights.map(height => 
        controller.adjustHeight({ targetHeight: height })
      );

      await Promise.all(promises);

      expect(mockBridge.calls).toHaveLength(heights.length);
      heights.forEach((height, index) => {
        expect(mockBridge.calls[index]!.args[0]).toBe(height);
      });
      expect(controller.getCurrentHeight()).toBe(heights[heights.length - 1]);
    });

    test('should handle concurrent adjustments correctly', async () => {
      mockBridge.delay = 50; // Simulate async bridge calls
      
      const results: number[] = [];
      const behavior1 = { 
        targetHeight: 400, 
        onUIChange: () => { results.push(400); } 
      };
      const behavior2 = { 
        targetHeight: 600, 
        onUIChange: () => { results.push(600); } 
      };

      // Start both adjustments simultaneously
      const [promise1, promise2] = await Promise.all([
        controller.adjustHeight(behavior1),
        controller.adjustHeight(behavior2)
      ]);

      // Both should complete successfully
      expect(results).toEqual([400, 600]);
      expect(controller.getCurrentHeight()).toBe(600);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle bridge failures gracefully', async () => {
      mockBridge.shouldFail = true;
      
      let uiChangeCalled = false;
      await controller.adjustHeight({
        targetHeight: 500,
        onUIChange: () => { uiChangeCalled = true; }
      });

      // UI callback should still be called for consistency
      expect(uiChangeCalled).toBe(true);
      expect(controller.getCurrentHeight()).toBe(500);
    });

    test('should continue processing queue after failures', async () => {
      mockBridge.shouldFail = true;
      
      // First adjustment fails
      await controller.adjustHeight({ targetHeight: 400 });
      
      mockBridge.shouldFail = false;
      
      // Second adjustment should succeed
      await controller.adjustHeight({ targetHeight: 600 });
      
      expect(mockBridge.calls).toHaveLength(2);
      expect(controller.getCurrentHeight()).toBe(600);
    });

    test('should handle async callback errors gracefully', async () => {
      await expect(controller.adjustHeight({
        targetHeight: 500,
        onUIComplete: async () => {
          throw new Error('Callback failed');
        }
      })).resolves.not.toThrow();
      
      expect(controller.getCurrentHeight()).toBe(500);
    });
  });

  describe('Disposal and Resource Management', () => {
    test('should dispose correctly', () => {
      controller.dispose();
      
      expect(controller.isDisposed).toBe(true);
    });

    test('should prevent operations after disposal', async () => {
      controller.dispose();
      
      await expect(controller.adjustHeight({ targetHeight: 400 }))
        .rejects.toThrow('Controller has been disposed');
    });

    test('should handle multiple dispose calls safely', () => {
      expect(() => {
        controller.dispose();
        controller.dispose();
        controller.dispose();
      }).not.toThrow();
      
      expect(controller.isDisposed).toBe(true);
    });

    test('should clear queue on disposal', () => {
      // Add items to queue (they won't execute immediately if we don't await)
      controller.adjustHeight({ targetHeight: 400 });
      controller.adjustHeight({ targetHeight: 600 });
      
      controller.dispose();
      
      // Queue should be cleared
      expect((controller as any).behaviorQueue.length).toBe(0);
    });
  });

  describe('Debug Mode', () => {
    test('should enable debug logging when debug=true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const debugController = new CoreHeightController(mockBridge, true);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initialized with platform bridge')
      );
      
      consoleSpy.mockRestore();
      debugController.dispose();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle minimum valid height (1px)', async () => {
      await controller.adjustHeight({ targetHeight: 1 });
      
      expect(mockBridge.calls[0]!.args[0]).toBe(1);
      expect(controller.getCurrentHeight()).toBe(1);
    });

    test('should handle maximum valid height (10000px)', async () => {
      await controller.adjustHeight({ targetHeight: 10000 });
      
      expect(mockBridge.calls[0]!.args[0]).toBe(10000);
      expect(controller.getCurrentHeight()).toBe(10000);
    });

    test('should handle same height adjustments', async () => {
      await controller.adjustHeight({ targetHeight: 400 });
      mockBridge.reset();
      
      // Adjust to same height
      await controller.adjustHeight({ targetHeight: 400 });
      
      expect(mockBridge.calls).toHaveLength(1);
      expect(controller.getCurrentHeight()).toBe(400);
    });
  });
});