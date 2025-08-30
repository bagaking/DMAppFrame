# @bagaking/dma-frame

> Elegant, unified API for document mini-app frame control

A lightweight, type-safe library providing intelligent height management for document addons, specifically designed for Feishu/Lark platform integration.

## 📋 Status

- **Version**: 0.1.0  
- **Stability**: Beta  
- **Platform**: Feishu/Lark Docs Addon  
- **TypeScript**: Full Support

## ✨ Features

- **🎯 First Principles Design**: Single interface, atomic operations
- **🔧 Platform Agnostic**: Clean abstraction layer supporting multiple platforms  
- **⚡ Intelligent Timing**: Smart expand/shrink strategies for optimal UX
- **🛡️ Type Safe**: Full TypeScript support with comprehensive error handling
- **🪶 Lightweight**: Zero dependencies except peer dependencies
- **🧪 Testable**: Built-in mock utilities for easy testing

## 📦 Installation

```bash
npm install @bagaking/dma-frame
```

### Peer Dependencies

```bash
npm install @lark-opdev/block-docs-addon-api
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { createFeishuHeightController } from '@bagaking/dma-frame';

// Create controller (automatically handles peer dependency)
const controller = await createFeishuHeightController();

// Adjust height with intelligent timing strategies
await controller.adjustHeight({
  targetHeight: 600,
  onUIChange: () => {
    // Called immediately for expanding, or before bridge call for shrinking
    setHeight(600);
  },
  onUIComplete: async () => {
    // Called after bridge call for expanding, or before bridge call for shrinking
    await animateContent();
  }
});
```

### Advanced Usage

```typescript
import { 
  createFeishuBridge, 
  CoreHeightController,
  type HeightAdjustmentBehavior 
} from '@bagaking/dma-frame';

// Create custom controller with debugging
const bridge = await createFeishuBridge({ debug: true });
const controller = new CoreHeightController(bridge, true);

// Multiple height adjustments are automatically queued and serialized
const behaviors: HeightAdjustmentBehavior[] = [
  { targetHeight: 400, onUIChange: () => setCompactMode(true) },
  { targetHeight: 800, onUIChange: () => setExpandedMode(true) }
];

await Promise.all(
  behaviors.map(behavior => controller.adjustHeight(behavior))
);
```

### React Integration

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { createFeishuHeightController, type HeightController } from '@bagaking/dma-frame';

function useFrameController() {
  const controllerRef = useRef<HeightController>();

  useEffect(() => {
    createFeishuHeightController({ 
      debug: process.env.NODE_ENV === 'development' 
    })
    .then(controller => {
      controllerRef.current = controller;
    })
    .catch(error => {
      console.error('Failed to create height controller:', error);
    });

    return () => controllerRef.current?.dispose();
  }, []);

  const adjustHeight = useCallback(async (targetHeight: number) => {
    if (!controllerRef.current || controllerRef.current.isDisposed) return;
    
    await controllerRef.current.adjustHeight({
      targetHeight,
      onUIChange: () => {
        // React state updates happen here
        setCurrentHeight(targetHeight);
      }
    });
  }, []);

  return { adjustHeight };
}
```

## 🎛️ API Reference

### Core Interfaces

#### `HeightController`

```typescript
interface HeightController {
  adjustHeight(behavior: HeightAdjustmentBehavior): Promise<void>;
  dispose(): void;
  readonly isDisposed: boolean;
}
```

#### `HeightAdjustmentBehavior`

```typescript
interface HeightAdjustmentBehavior {
  readonly targetHeight: number;
  readonly onUIChange?: () => void | Promise<void>;
  readonly onUIComplete?: () => void | Promise<void>;
}
```

### Factory Functions

#### `createFeishuHeightController(options?)`

Creates a complete height controller for Feishu platform.

```typescript
const controller = await createFeishuHeightController({
  debug: true, // Enable debug logging
  platformId: 'my-addon' // Custom platform identifier
});
```

#### `createFeishuBridge(options?)`

Creates just the platform bridge for advanced use cases.

#### `createMockHeightController(options?)`

Creates a mock controller for testing.

## 🔧 Platform Support

### Feishu/Lark

Full support via `@lark-opdev/block-docs-addon-api` integration.

### Custom Platforms

Implement the `PlatformBridge` interface:

```typescript
import { PlatformBridge, CoreHeightController } from '@bagaking/dma-frame';

class CustomPlatformBridge implements PlatformBridge {
  async updateHeight(targetHeight: number): Promise<number> {
    // Your platform-specific implementation
    await yourPlatformAPI.setFrameHeight(targetHeight);
    return targetHeight;
  }
}

const controller = new CoreHeightController(new CustomPlatformBridge());
```

## 🧪 Testing

Built-in mock utilities make testing easy:

```typescript
import { createMockHeightController } from '@bagaking/dma-frame';

describe('Height Controller', () => {
  it('should adjust height correctly', async () => {
    const controller = createMockHeightController({ debug: true });
    
    let uiHeight = 0;
    await controller.adjustHeight({
      targetHeight: 500,
      onUIChange: () => { uiHeight = 500; }
    });
    
    expect(uiHeight).toBe(500);
  });
});
```

## 🏗️ Architecture Principles

### First Principles Design
- **Single Interface**: One `adjustHeight` method handles all complexity
- **Atomic Operations**: Height changes and UI updates are treated as single transactions
- **Intelligent Sequencing**: Automatic optimization for expand vs. shrink operations

### Clean Architecture
- **Platform Abstraction**: `PlatformBridge` interface isolates platform specifics
- **Dependency Inversion**: Core logic depends on abstractions, not implementations
- **Single Responsibility**: Each class has one clear purpose

## 📄 License

MIT © bagaking

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for better document addon experiences**