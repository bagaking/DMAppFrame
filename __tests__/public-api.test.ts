import createController, {
  CoreHeightController,
  FeishuPlatformBridge,
  HeightControllerError,
  LegacyHeightController,
  PlatformBridgeError,
  createFeishuBridge,
  createFeishuHeightController,
  createMockBridge,
  createMockHeightController
} from '../src/index.js';

describe('public package entrypoint', () => {
  test('should expose the documented controller factories', async () => {
    expect(createController).toBe(createFeishuHeightController);
    expect(typeof createFeishuBridge).toBe('function');
    expect(typeof createMockBridge).toBe('function');
    expect(typeof createMockHeightController).toBe('function');

    const bridge = createMockBridge({ platformId: 'public-api-test' });
    await expect(bridge.updateHeight(240)).resolves.toBe(240);

    const controller = createMockHeightController({ platformId: 'public-api-test' });
    await controller.adjustHeight({ targetHeight: 320 });

    expect(controller.isDisposed).toBe(false);
    controller.dispose();
  });

  test('should expose compatibility classes and errors', () => {
    expect(LegacyHeightController).toBe(CoreHeightController);
    expect(typeof FeishuPlatformBridge).toBe('function');

    const bridgeError = new PlatformBridgeError('bridge failed', 'test-platform');
    const controllerError = new HeightControllerError('controller failed');

    expect(bridgeError).toMatchObject({
      code: 'PLATFORM_BRIDGE_ERROR',
      platform: 'test-platform'
    });
    expect(controllerError).toMatchObject({
      code: 'HEIGHT_CONTROLLER_ERROR'
    });
  });
});
