# @bagaking/dma-frame 设计文档

## 📋 项目概述

基于第一性原理，为文档小组件提供极简而强大的高度控制能力。继承原 AddOnFrameController 的核心理念，打造独立、通用的开源包。

## 🎯 设计原则

### 第一性原理
1. **单一真理来源**：只有一个高度状态，一个调整入口
2. **立即响应**：小组件模式切换立即更新UI  
3. **原子操作**：高度变化与UI变化绑定为单个事务
4. **串行化**：Bridge API调用严格串行化，避免竞态条件
5. **零抽象负担**：移除所有不必要的管理器和适配器

### 用户体验
- **认知负担最小**：只有三个参数需要理解
- **行为可预测**：调用就执行，无意外行为
- **零学习成本**：直观的参数命名

## 🎯 核心设计：极简单一接口

### 唯一接口

框架只提供一个方法：`adjustHeight(behavior)`

```typescript
interface HeightAdjustmentBehavior {
  targetHeight: number;        // 目标高度（自动识别from）
  onUIChange: () => void;      // 触发组件内UI变化的钩子
  onUIComplete?: () => Promise<void>; // 检测UI变化完成的钩子（可选）
}

// 使用
await controller.adjustHeight({
  targetHeight: 600,
  onUIChange: () => setCurrentHeight(600),
  onUIComplete: async () => await waitForAnimation()
});
```

## 🏗️ 内部架构

虽然接口极简，但内部保持完整系统：

### 1. 时序控制系统
```
扩展时序 (targetHeight > currentHeight)：
1. Bridge API 先调用 → 组件获得空间
2. onUIChange() → UI填充空间
3. onUIComplete() → 等待完成

收缩时序 (targetHeight < currentHeight)：
1. onUIChange() → UI先收缩
2. onUIComplete() → 等待完成  
3. Bridge API 后调用 → 组件跟随
```

### 2. 串行化队列系统
- 所有调用自动排队
- 严格按顺序执行
- 防止并发冲突

### 3. 平台抽象系统
```typescript
interface PlatformBridge {
  updateHeight(height: number): Promise<number>;
}
```

### 4. 容错系统
- Bridge API 失败时UI状态保持一致
- 自动降级处理
- 不回滚已展示的界面

## 💡 移除的复杂概念

1. **❌ 优先级系统**：串行化更重要，优先级增加复杂度
2. **❌ 约束系统**：交给应用层处理，框架不包含业务概念
3. **❌ 档位制**：应用层关注点，不属于框架
4. **❌ 微小变化检测**：框架不替用户做"聪明"判断
5. **❌ 复杂配置**：只有必要的平台桥接配置
6. **❌ 多种调用方式**：只有一个接口

## 🎨 实现要求

### 核心类结构
```typescript
class CoreHeightController implements HeightController {
  private currentHeight = 0;
  private behaviorQueue: HeightAdjustmentBehavior[] = [];
  private executing = false;

  constructor(bridge: PlatformBridge, debug?: boolean) {}
  
  // 唯一公共接口
  async adjustHeight(behavior: HeightAdjustmentBehavior): Promise<void>
  
  // 辅助方法
  dispose(): void
  get isDisposed(): boolean
}
```

### 创建方式
```typescript
// 飞书平台（最常用）
const controller = await createFeishuHeightController();

// 自定义平台
const controller = new CoreHeightController(customBridge);

// 测试环境
const controller = createMockHeightController();
```

## 📦 包结构

简洁的文件组织：
```
src/
├── index.ts           # 主要导出和工厂函数
├── HeightController.ts # 核心实现
├── FeishuBridge.ts    # 飞书平台适配器
└── types.ts           # 类型定义
```

## 🚀 发布计划

### v0.1.0 目标
- [x] 核心 HeightController 实现
- [x] Feishu 平台支持
- [x] TypeScript 完整类型支持
- [x] 工厂函数和便捷 API
- [ ] 完整的测试覆盖
- [ ] 详细的使用文档

### 兼容性策略
- 与原 AddOnFrameController API 完全兼容
- 提供 Legacy 类型别名 (HeightBehavior)
- 支持平滑迁移

## 🎯 成功标准

1. **API 简洁性**：只需要理解3个参数
2. **行为可预测性**：调用行为与预期完全一致
3. **平台兼容性**：支持 Feishu 并可扩展到其他平台
4. **性能要求**：无性能负担，串行化执行
5. **类型安全**：完整的 TypeScript 支持

---

*基于第一性原理的终态设计，消除一切不必要的复杂度，专注于用户的本质需求。*