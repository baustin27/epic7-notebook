import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/app/globals.css';

// Theme provider for Storybook
const ThemeProvider = ({ children, theme }: { children: React.ReactNode; theme: 'light' | 'dark' }) => {
  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      toc: true,
    },
    a11y: {
      config: {},
      options: {},
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
        'desktop-wide': {
          name: 'Desktop Wide',
          styles: {
            width: '1920px',
            height: '1080px',
          },
        },
      },
      defaultViewport: 'desktop',
    },
  },
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'circlehollow', title: 'Light Mode' },
          { value: 'dark', icon: 'circle', title: 'Dark Mode' },
        ],
        showName: true,
      },
    },
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider theme={context.globals.theme || 'light'}>
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;