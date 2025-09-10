import type { Meta, StoryObj } from '@storybook/react';

// Color Palette Component
const ColorPalette = () => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold mb-6">Color Palette</h2>

    {/* Primary Colors */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Primary Colors</h3>
      <div className="grid grid-cols-5 gap-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Blue 50</div>
          <div className="text-xs text-gray-500">#eff6ff</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Blue 100</div>
          <div className="text-xs text-gray-500">#dbeafe</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Blue 500</div>
          <div className="text-xs text-gray-500">#3b82f6</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Blue 600</div>
          <div className="text-xs text-gray-500">#2563eb</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-700 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Blue 700</div>
          <div className="text-xs text-gray-500">#1d4ed8</div>
        </div>
      </div>
    </div>

    {/* Gray Colors */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Gray Scale</h3>
      <div className="grid grid-cols-5 gap-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Gray 50</div>
          <div className="text-xs text-gray-500">#f9fafb</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Gray 100</div>
          <div className="text-xs text-gray-500">#f3f4f6</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-500 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Gray 500</div>
          <div className="text-xs text-gray-500">#6b7280</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-600 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Gray 600</div>
          <div className="text-xs text-gray-500">#4b5563</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Gray 900</div>
          <div className="text-xs text-gray-500">#111827</div>
        </div>
      </div>
    </div>

    {/* Semantic Colors */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Semantic Colors</h3>
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Success</div>
          <div className="text-xs text-gray-500">#10b981</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Error</div>
          <div className="text-xs text-gray-500">#ef4444</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-500 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Warning</div>
          <div className="text-xs text-gray-500">#f59e0b</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-lg mx-auto mb-2"></div>
          <div className="text-sm font-medium">Info</div>
          <div className="text-xs text-gray-500">#3b82f6</div>
        </div>
      </div>
    </div>
  </div>
);

// Typography Component
const TypographyShowcase = () => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold mb-6">Typography</h2>

    {/* Headings */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Headings</h3>
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold">Heading 1 (4xl)</h1>
          <div className="text-sm text-gray-500 mt-1">Font size: 2.25rem (36px), Font weight: 700</div>
        </div>
        <div>
          <h2 className="text-3xl font-bold">Heading 2 (3xl)</h2>
          <div className="text-sm text-gray-500 mt-1">Font size: 1.875rem (30px), Font weight: 700</div>
        </div>
        <div>
          <h3 className="text-2xl font-semibold">Heading 3 (2xl)</h3>
          <div className="text-sm text-gray-500 mt-1">Font size: 1.5rem (24px), Font weight: 600</div>
        </div>
        <div>
          <h4 className="text-xl font-semibold">Heading 4 (xl)</h4>
          <div className="text-sm text-gray-500 mt-1">Font size: 1.25rem (20px), Font weight: 600</div>
        </div>
        <div>
          <h5 className="text-lg font-medium">Heading 5 (lg)</h5>
          <div className="text-sm text-gray-500 mt-1">Font size: 1.125rem (18px), Font weight: 500</div>
        </div>
        <div>
          <h6 className="text-base font-medium">Heading 6 (base)</h6>
          <div className="text-sm text-gray-500 mt-1">Font size: 1rem (16px), Font weight: 500</div>
        </div>
      </div>
    </div>

    {/* Body Text */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Body Text</h3>
      <div className="space-y-4">
        <div>
          <p className="text-base">Body text (base) - This is the default body text size used throughout the application.</p>
          <div className="text-sm text-gray-500 mt-1">Font size: 1rem (16px), Line height: 1.5</div>
        </div>
        <div>
          <p className="text-sm">Small text (sm) - This is smaller body text for secondary information.</p>
          <div className="text-sm text-gray-500 mt-1">Font size: 0.875rem (14px), Line height: 1.25</div>
        </div>
        <div>
          <p className="text-xs">Extra small text (xs) - This is the smallest text size for metadata and labels.</p>
          <div className="text-sm text-gray-500 mt-1">Font size: 0.75rem (12px), Line height: 1</div>
        </div>
      </div>
    </div>

    {/* Font Weights */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Font Weights</h3>
      <div className="space-y-2">
        <p className="font-light">Light (300) - Light font weight</p>
        <p className="font-normal">Normal (400) - Normal font weight</p>
        <p className="font-medium">Medium (500) - Medium font weight</p>
        <p className="font-semibold">Semibold (600) - Semibold font weight</p>
        <p className="font-bold">Bold (700) - Bold font weight</p>
      </div>
    </div>
  </div>
);

// Spacing Component
const SpacingShowcase = () => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold mb-6">Spacing Scale</h2>

    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Padding & Margin</h3>
        <div className="space-y-4">
          {['p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-12', 'p-16'].map((className) => (
            <div key={className} className="flex items-center">
              <div className={`bg-blue-100 ${className} rounded border-2 border-blue-200 min-w-8 min-h-8`}></div>
              <span className="ml-4 text-sm font-medium">{className}</span>
              <span className="ml-2 text-sm text-gray-500">
                ({className === 'p-1' ? '0.25rem' :
                  className === 'p-2' ? '0.5rem' :
                  className === 'p-3' ? '0.75rem' :
                  className === 'p-4' ? '1rem' :
                  className === 'p-6' ? '1.5rem' :
                  className === 'p-8' ? '2rem' :
                  className === 'p-12' ? '3rem' :
                  className === 'p-16' ? '4rem' : ''})
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Gap Spacing</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 6, 8, 12].map((gap) => (
            <div key={gap} className="flex items-center">
              <div className={`flex gap-${gap} bg-gray-100 p-2 rounded`}>
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
              </div>
              <span className="ml-4 text-sm font-medium">gap-{gap}</span>
              <span className="ml-2 text-sm text-gray-500">
                ({gap === 1 ? '0.25rem' :
                  gap === 2 ? '0.5rem' :
                  gap === 3 ? '0.75rem' :
                  gap === 4 ? '1rem' :
                  gap === 6 ? '1.5rem' :
                  gap === 8 ? '2rem' :
                  gap === 12 ? '3rem' : ''})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Main Design System Component
const DesignSystem = () => (
  <div className="max-w-6xl mx-auto p-8 space-y-12">
    <div className="text-center mb-12">
      <h1 className="text-3xl font-bold mb-4">Design System</h1>
      <p className="text-gray-600 max-w-2xl mx-auto">
        Comprehensive design system showcasing colors, typography, spacing, and component patterns
        used throughout the Sleek Modern Chat Interface.
      </p>
    </div>

    <ColorPalette />
    <TypographyShowcase />
    <SpacingShowcase />
  </div>
);

const meta: Meta<typeof DesignSystem> = {
  title: 'Design System/Overview',
  component: DesignSystem,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Complete design system overview showcasing colors, typography, spacing, and design patterns.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DesignSystem>;

export const Overview: Story = {
  render: () => <DesignSystem />,
};