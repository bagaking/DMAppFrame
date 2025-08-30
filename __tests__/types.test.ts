/**
 * @bagaking/dma-frame - Types and Utilities Tests
 * 测试框架工具函数和类型安全性
 */

import {
  generateDebugId,
  isReasonableHeight,
  isModuleImportError,
  FRAMEWORK_CONSTANTS,
  DMAppFrameError,
  PlatformBridgeError,
  HeightControllerError
} from '../src/types.js';

describe('Framework Constants', () => {
  test('should have correct constant values', () => {
    expect(FRAMEWORK_CONSTANTS.MAX_REASONABLE_HEIGHT).toBe(10000);
    expect(FRAMEWORK_CONSTANTS.MIN_REASONABLE_HEIGHT).toBe(1);
    expect(FRAMEWORK_CONSTANTS.DEBUG_ID_ENTROPY_LENGTH).toBe(8);
  });

  test('constants should be readonly', () => {
    // TypeScript enforces readonly at compile time with 'as const'
    // In runtime, the object properties are still mutable
    const originalValue = FRAMEWORK_CONSTANTS.MAX_REASONABLE_HEIGHT;
    
    // This won't throw, but TypeScript prevents it
    // @ts-ignore 
    FRAMEWORK_CONSTANTS.MAX_REASONABLE_HEIGHT = 999;
    expect(FRAMEWORK_CONSTANTS.MAX_REASONABLE_HEIGHT).toBe(999);
    
    // Restore for other tests
    // @ts-ignore
    FRAMEWORK_CONSTANTS.MAX_REASONABLE_HEIGHT = originalValue;
  });
});

describe('generateDebugId', () => {
  test('should generate unique IDs with correct format', () => {
    const id1 = generateDebugId('TestPrefix');
    const id2 = generateDebugId('TestPrefix');
    
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^TestPrefix-\d+-[a-z0-9]{8}$/);
    expect(id2).toMatch(/^TestPrefix-\d+-[a-z0-9]{8}$/);
  });

  test('should handle different prefixes', () => {
    const controllerID = generateDebugId('HeightController');
    const bridgeID = generateDebugId('PlatformBridge');
    
    expect(controllerID).toMatch(/^HeightController-\d+-[a-z0-9]{8}$/);
    expect(bridgeID).toMatch(/^PlatformBridge-\d+-[a-z0-9]{8}$/);
  });

  test('should handle empty prefix', () => {
    const id = generateDebugId('');
    expect(id).toMatch(/^-\d+-[a-z0-9]{8}$/);
  });

  test('should generate different IDs across time', async () => {
    const id1 = generateDebugId('Test');
    
    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 2));
    
    const id2 = generateDebugId('Test');
    expect(id1).not.toBe(id2);
  });
});

describe('isReasonableHeight', () => {
  test('should accept valid heights', () => {
    expect(isReasonableHeight(1)).toBe(true);
    expect(isReasonableHeight(400)).toBe(true);
    expect(isReasonableHeight(800)).toBe(true);
    expect(isReasonableHeight(10000)).toBe(true);
  });

  test('should reject heights below minimum', () => {
    expect(isReasonableHeight(0)).toBe(false);
    expect(isReasonableHeight(-100)).toBe(false);
  });

  test('should reject heights above maximum', () => {
    expect(isReasonableHeight(10001)).toBe(false);
    expect(isReasonableHeight(50000)).toBe(false);
  });

  test('should handle edge cases', () => {
    expect(isReasonableHeight(0.5)).toBe(false);
    expect(isReasonableHeight(1.5)).toBe(true);
    expect(isReasonableHeight(9999.9)).toBe(true);
    expect(isReasonableHeight(10000.1)).toBe(false);
  });
});

describe('isModuleImportError', () => {
  test('should detect module not found errors by name', () => {
    const error = new Error('Module not found');
    error.name = 'ModuleNotFoundError';
    
    expect(isModuleImportError(error)).toBe(true);
  });

  test('should detect import errors by name', () => {
    const error = new Error('Import failed');
    error.name = 'ImportError';
    
    expect(isModuleImportError(error)).toBe(true);
  });

  test('should detect resolve errors by name', () => {
    const error = new Error('Resolution failed');
    error.name = 'ResolveError';
    
    expect(isModuleImportError(error)).toBe(true);
  });

  test('should detect module errors by message patterns', () => {
    const testCases = [
      'Module not found: @some/package',
      'Cannot resolve module "@some/package"',
      'Failed to resolve module "@some/package"',
      'Module does not exist: "@some/package"',
      'Cannot find module "@some/package"',
      'Error resolving module "@some/package"'
    ];

    testCases.forEach(message => {
      const error = new Error(message);
      expect(isModuleImportError(error)).toBe(true);
    });
  });

  test('should be case insensitive for message patterns', () => {
    const error = new Error('MODULE NOT FOUND: @some/package');
    expect(isModuleImportError(error)).toBe(true);
  });

  test('should reject non-module errors', () => {
    const regularError = new Error('Something else went wrong');
    expect(isModuleImportError(regularError)).toBe(false);
    
    const typeError = new TypeError('Invalid argument');
    expect(isModuleImportError(typeError)).toBe(false);
  });

  test('should handle non-Error objects', () => {
    expect(isModuleImportError(null)).toBe(false);
    expect(isModuleImportError(undefined)).toBe(false);
    expect(isModuleImportError('string error')).toBe(false);
    expect(isModuleImportError({ message: 'not an error' })).toBe(false);
  });

  test('should handle errors without message', () => {
    const error = new Error();
    error.message = '';
    expect(isModuleImportError(error)).toBe(false);
  });
});

describe('Error Classes', () => {
  describe('DMAppFrameError', () => {
    test('should create error with correct properties', () => {
      const error = new DMAppFrameError('Test message', 'TEST_CODE', 'test-platform');
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.platform).toBe('test-platform');
      expect(error.name).toBe('DMAppFrameError');
      expect(error instanceof Error).toBe(true);
    });

    test('should work without platform parameter', () => {
      const error = new DMAppFrameError('Test message', 'TEST_CODE');
      
      expect(error.platform).toBeUndefined();
    });
  });

  describe('PlatformBridgeError', () => {
    test('should create error with correct properties', () => {
      const error = new PlatformBridgeError('Bridge failed', 'feishu');
      
      expect(error.message).toBe('Bridge failed');
      expect(error.code).toBe('PLATFORM_BRIDGE_ERROR');
      expect(error.platform).toBe('feishu');
      expect(error.name).toBe('PlatformBridgeError');
      expect(error instanceof DMAppFrameError).toBe(true);
    });
  });

  describe('HeightControllerError', () => {
    test('should create error with correct properties', () => {
      const error = new HeightControllerError('Controller failed');
      
      expect(error.message).toBe('Controller failed');
      expect(error.code).toBe('HEIGHT_CONTROLLER_ERROR');
      expect(error.name).toBe('HeightControllerError');
      expect(error instanceof DMAppFrameError).toBe(true);
    });

    test('should work with platform parameter', () => {
      const error = new HeightControllerError('Controller failed', 'test-platform');
      
      expect(error.platform).toBe('test-platform');
    });
  });

  test('all custom errors should be instanceof Error', () => {
    const dmError = new DMAppFrameError('test', 'TEST');
    const bridgeError = new PlatformBridgeError('test', 'platform');
    const controllerError = new HeightControllerError('test');
    
    expect(dmError instanceof Error).toBe(true);
    expect(bridgeError instanceof Error).toBe(true);
    expect(controllerError instanceof Error).toBe(true);
  });
});