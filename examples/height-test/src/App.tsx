import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createFeishuHeightController, type HeightController } from '@bagaking/dma-frame';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const HeightTest: React.FC = () => {
  const [controller, setController] = useState<HeightController | null>(null);
  const [currentHeight, setCurrentHeight] = useState(400);
  const [targetHeight, setTargetHeight] = useState(400);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [contentHeight, setContentHeight] = useState(400);
  const [isExpanding, setIsExpanding] = useState<boolean | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [...prev.slice(-19), logEntry]); // 保留最新20条
  }, []);

  // 初始化控制器
  useEffect(() => {
    let mounted = true;
    
    const initController = async () => {
      try {
        addLog('🚀 初始化 DMAppFrame 高度控制器...', 'info');
        const heightController = await createFeishuHeightController({ 
          debug: true 
        });
        
        if (mounted) {
          setController(heightController);
          setIsInitialized(true);
          addLog('✅ 控制器初始化成功！', 'success');
        }
      } catch (error) {
        if (mounted) {
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          addLog(`❌ 控制器初始化失败: ${errorMsg}`, 'error');
          console.error('Controller initialization failed:', error);
        }
      }
    };

    initController();

    return () => {
      mounted = false;
      if (controller) {
        controller.dispose?.();
      }
    };
  }, [addLog]);

  // 高度调整测试 - 增强版，展示延迟效果
  const testHeightAdjustment = useCallback(async (height: number, withDelay: boolean = true) => {
    if (!controller) {
      addLog('❌ 控制器未初始化', 'error');
      return;
    }

    setIsLoading(true);
    const expanding = height > currentHeight;
    setIsExpanding(expanding);
    
    addLog(`🔄 开始调整高度: ${currentHeight}px → ${height}px ${expanding ? '(扩展)' : '(收缩)'}`, 'info');
    addLog(`⚡ 策略: ${expanding ? 'UI组件先变，内容后填' : 'UI内容先变，组件后随'}`, 'info');

    try {
      await controller.adjustHeight({
        targetHeight: height,
        onUIChange: () => {
          if (expanding) {
            // 扩展：组件高度先变
            setCurrentHeight(height);
            addLog(`📐 容器高度立即调整: ${height}px`, 'success');
            addLog(`⏳ 等待内容填充...`, 'info');
          } else {
            // 收缩：UI内容先变
            setContentHeight(height);
            addLog(`🎨 内容开始收缩动画...`, 'info');
          }
        },
        onUIComplete: async () => {
          if (withDelay) {
            // 模拟内容变化延迟
            await new Promise(resolve => setTimeout(resolve, expanding ? 800 : 600));
          }
          
          if (expanding) {
            // 扩展：现在填充内容
            setContentHeight(height);
            addLog(`✨ 内容填充完成: ${height}px`, 'success');
          } else {
            // 收缩：现在调整容器
            setCurrentHeight(height);
            addLog(`📐 容器高度调整完成: ${height}px`, 'success');
          }
        }
      });
      
      addLog(`🎉 高度调整完成: ${height}px`, 'success');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '调整失败';
      addLog(`⚠️ 高度调整异常: ${errorMsg}`, 'warning');
    } finally {
      setIsLoading(false);
      setIsExpanding(null);
    }
  }, [controller, addLog, currentHeight]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetHeight(parseInt(e.target.value));
  };

  const handleApplyHeight = () => {
    testHeightAdjustment(targetHeight);
  };

  const runQuickTests = async () => {
    const testHeights = [300, 500, 800, 400];
    
    for (let i = 0; i < testHeights.length; i++) {
      const height = testHeights[i];
      await testHeightAdjustment(height);
      if (i < testHeights.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      }
    }
  };

  return (
    <div ref={containerRef} className="height-test-container">
      <div className="test-panel">
        <h1>DMAppFrame 高度控制测试</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <strong>状态:</strong>{' '}
          <span style={{ 
            color: isInitialized ? '#4ade80' : '#f87171',
            fontWeight: 'bold' 
          }}>
            {isInitialized ? '✅ 已就绪' : '⏳ 初始化中...'}
          </span>
        </div>

        <div className="status-info">
          <div>
            <strong>容器高度:</strong> <span style={{ color: '#007acc' }}>{currentHeight}px</span>
          </div>
          <div>
            <strong>内容高度:</strong> <span style={{ color: '#ff9500' }}>{contentHeight}px</span>
          </div>
          {isExpanding !== null && (
            <div style={{ 
              color: isExpanding ? '#ff9500' : '#007acc',
              fontWeight: 'bold'
            }}>
              {isExpanding ? '↗️ 扩展中' : '↘️ 收缩中'}
            </div>
          )}
        </div>

        {/* 简洁的可视化演示 */}
        <div>
          <h3>高度变化演示</h3>
          
          <div className="height-visual" style={{ height: `${Math.max(currentHeight / 4, 60)}px` }}>
            {/* 容器高度指示器 */}
            <div 
              className="height-indicator"
              style={{ height: `${Math.max(currentHeight / 4 - 16, 20)}px` }}
            >
              容器: {currentHeight}px
            </div>
            
            {/* 内容高度指示器 */}
            <div 
              className="content-indicator"
              style={{ height: `${Math.max(contentHeight / 4 - 16, 15)}px` }}
            >
              内容: {contentHeight}px
            </div>
          </div>
          
          <div style={{ 
            fontSize: '12px', 
            color: '#666',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            蓝色=容器边界 | 橙色=内容区域 | 缩放比例 1:4
          </div>
        </div>
      </div>

      {/* 手动控制面板 */}
      <div className="test-panel">
        <h2>手动控制</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            目标高度: {targetHeight}px
          </label>
          <input
            type="range"
            min="200"
            max="1000"
            step="50"
            value={targetHeight}
            onChange={handleSliderChange}
            className="height-slider"
            disabled={!isInitialized || isLoading}
          />
        </div>

        <div>
          <button
            onClick={handleApplyHeight}
            disabled={!isInitialized || isLoading}
            className="button"
          >
            {isLoading ? '调整中...' : `应用高度 ${targetHeight}px`}
          </button>
        </div>
      </div>

      {/* 快速测试 */}
      <div className="test-panel">
        <h2>功能测试</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <h3>快速高度预设</h3>
          <button onClick={() => testHeightAdjustment(300)} disabled={!isInitialized || isLoading} className="button">
            紧凑 (300px)
          </button>
          <button onClick={() => testHeightAdjustment(400)} disabled={!isInitialized || isLoading} className="button">
            标准 (400px)
          </button>
          <button onClick={() => testHeightAdjustment(600)} disabled={!isInitialized || isLoading} className="button">
            对话 (600px)
          </button>
          <button onClick={() => testHeightAdjustment(800)} disabled={!isInitialized || isLoading} className="button">
            扩展 (800px)
          </button>
        </div>

        <div>
          <h3>时序策略演示</h3>
          <button onClick={() => testHeightAdjustment(700, true)} disabled={!isInitialized || isLoading} className="button timing-demo">
            扩展延迟演示
          </button>
          <button onClick={() => testHeightAdjustment(350, true)} disabled={!isInitialized || isLoading} className="button timing-demo">
            收缩延迟演示
          </button>
          <button onClick={runQuickTests} disabled={!isInitialized || isLoading} className="button">
            连续测试
          </button>
        </div>
      </div>

      {/* 日志显示 */}
      <div className="test-panel">
        <h2>执行日志</h2>
        
        <div className="status-display">
          {logs.length === 0 ? (
            <div style={{ opacity: 0.6 }}>等待操作...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="log-entry">
                <span style={{ opacity: 0.7 }}>[{log.timestamp}]</span>{' '}
                <span style={{
                  color: 
                    log.type === 'success' ? '#4ade80' :
                    log.type === 'error' ? '#f87171' :
                    log.type === 'warning' ? '#fbbf24' :
                    'inherit'
                }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HeightTest;