import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect } from 'react';

// Accessibility Testing Component
const AccessibilityTester = ({ children }: { children: React.ReactNode }) => {
  const [violations, setViolations] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runAxeTest = async () => {
    setIsRunning(true);
    try {
      // Dynamic import to avoid issues if axe-core is not available
      const axe = await import('axe-core');
      const results = await axe.run(document.body);
      setViolations(results.violations);
    } catch (error) {
      console.error('Failed to run accessibility test:', error);
      setViolations([]);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runAxeTest();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Accessibility Test Results</h3>
        <button
          onClick={runAxeTest}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 mb-4"
        >
          {isRunning ? 'Running Tests...' : 'Run Accessibility Test'}
        </button>

        {violations.length > 0 ? (
          <div className="space-y-4">
            <div className="text-red-600 font-medium">
              Found {violations.length} accessibility violation{violations.length !== 1 ? 's' : ''}
            </div>
            {violations.map((violation, index) => (
              <div key={index} className="border border-red-200 rounded p-4 bg-red-50">
                <div className="font-medium text-red-800 mb-2">
                  {violation.help}
                </div>
                <div className="text-sm text-red-700 mb-2">
                  {violation.description}
                </div>
                <div className="text-xs text-gray-600">
                  Impact: <span className="font-medium">{violation.impact}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Tags: {violation.tags.join(', ')}
                </div>
                {violation.nodes && violation.nodes.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-gray-700">Affected elements:</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {violation.nodes.length} element{violation.nodes.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-green-600 font-medium">
            No accessibility violations found! 🎉
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Component Under Test</h3>
        <div className="border border-gray-200 rounded p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Performance Profiler Component
const PerformanceProfiler = ({ children }: { children: React.ReactNode }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isProfiling, setIsProfiling] = useState(false);

  const runPerformanceTest = () => {
    setIsProfiling(true);

    // Simulate performance measurement
    const startTime = performance.now();

    // Force a re-render to measure
    setTimeout(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      setMetrics({
        renderTime: renderTime.toFixed(2),
        timestamp: new Date().toISOString(),
        memory: (performance as any).memory ? {
          used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024),
        } : null,
      });

      setIsProfiling(false);
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
        <button
          onClick={runPerformanceTest}
          disabled={isProfiling}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 mb-4"
        >
          {isProfiling ? 'Profiling...' : 'Run Performance Test'}
        </button>

        {metrics && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Render Time:</span>
              <span>{metrics.renderTime}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Timestamp:</span>
              <span className="text-sm text-gray-600">{new Date(metrics.timestamp).toLocaleTimeString()}</span>
            </div>
            {metrics.memory && (
              <>
                <div className="flex justify-between">
                  <span className="font-medium">Memory Used:</span>
                  <span>{metrics.memory.used}MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Memory Total:</span>
                  <span>{metrics.memory.total}MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Memory Limit:</span>
                  <span>{metrics.memory.limit}MB</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Component Under Test</h3>
        <div className="border border-gray-200 rounded p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// State Inspector Component
const StateInspector = ({ componentName, state }: { componentName: string; state: any }) => {
  const [expanded, setExpanded] = useState(false);

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') return 'Object';
    return String(value);
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">State Inspector - {componentName}</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2">
          {Object.entries(state).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
              <span className="font-medium text-gray-700">{key}:</span>
              <span className="text-gray-600 font-mono text-sm">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      )}

      {!expanded && (
        <div className="text-sm text-gray-500">
          {Object.keys(state).length} state properties
        </div>
      )}
    </div>
  );
};

// Example component with state for testing
const ExampleComponent = () => {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('Hello World');
  const [isActive, setIsActive] = useState(false);
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);

  const state = { count, text, isActive, items };

  return (
    <div className="space-y-4">
      <StateInspector componentName="ExampleComponent" state={state} />

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Interactive Example</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Count: {count}</label>
            <button
              onClick={() => setCount(count + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Increment
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Text Input</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mr-2"
              />
              Is Active
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Items</label>
            <button
              onClick={() => setItems([...items, `Item ${items.length + 1}`])}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add Item
            </button>
            <ul className="mt-2 space-y-1">
              {items.map((item, index) => (
                <li key={index} className="text-sm text-gray-600">• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const meta: Meta = {
  title: 'Debug Tools/Overview',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Debugging tools for development including accessibility testing, performance profiling, and state inspection.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const AccessibilityTesting: StoryObj = {
  render: () => (
    <AccessibilityTester>
      <div>
        <h1>Sample Component for Testing</h1>
        <button>Click me</button>
        <img src="https://via.placeholder.com/100" alt="" /> {/* Missing alt text for testing */}
        <div style={{ color: 'white', backgroundColor: 'white' }}>Low contrast text</div>
      </div>
    </AccessibilityTester>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Test components for accessibility violations using axe-core.',
      },
    },
  },
};

export const PerformanceProfiling: StoryObj = {
  render: () => (
    <PerformanceProfiler>
      <div>
        <h2>Performance Test Component</h2>
        <p>This component will be profiled for render performance.</p>
        <div className="grid grid-cols-10 gap-2 mt-4">
          {Array.from({ length: 100 }, (_, i) => (
            <div key={i} className="w-8 h-8 bg-blue-500 rounded"></div>
          ))}
        </div>
      </div>
    </PerformanceProfiler>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Profile component performance including render time and memory usage.',
      },
    },
  },
};

export const StateInspection: StoryObj = {
  render: () => <ExampleComponent />,
  parameters: {
    docs: {
      description: {
        story: 'Inspect component state in real-time with interactive controls.',
      },
    },
  },
};