import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner, TypingIndicator, ButtonSpinner } from './LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile loading spinner component with multiple sizes, colors, and variants for different use cases.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Size of the spinner',
    },
    color: {
      control: { type: 'select' },
      options: ['blue', 'gray', 'white'],
      description: 'Color theme of the spinner',
    },
    showText: {
      control: { type: 'boolean' },
      description: 'Whether to show loading text',
    },
    text: {
      control: { type: 'text' },
      description: 'Custom loading text',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Default: Story = {
  args: {
    size: 'md',
    color: 'blue',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    color: 'blue',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    color: 'blue',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    color: 'blue',
  },
};

export const Gray: Story = {
  args: {
    size: 'md',
    color: 'gray',
  },
};

export const White: Story = {
  args: {
    size: 'md',
    color: 'white',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

export const WithText: Story = {
  args: {
    size: 'md',
    color: 'blue',
    showText: true,
    text: 'Loading...',
  },
};

export const CustomText: Story = {
  args: {
    size: 'lg',
    color: 'gray',
    showText: true,
    text: 'Processing your request...',
  },
};

export const InContainer: Story = {
  args: {
    size: 'md',
    color: 'blue',
    className: 'p-8 bg-gray-50 rounded-lg',
  },
};

// Typing Indicator Stories
export const TypingIndicatorStory: StoryObj<typeof TypingIndicator> = {
  render: (args) => <TypingIndicator {...args} />,
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Typing indicator for AI responses with animated dots.',
      },
    },
  },
};

TypingIndicatorStory.storyName = 'Typing Indicator';

// Button Spinner Stories
export const ButtonSpinnerStory: StoryObj<typeof ButtonSpinner> = {
  render: (args) => <ButtonSpinner {...args} />,
  args: {
    size: 'md',
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Size of the button spinner',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Small spinner optimized for use inside buttons during loading states.',
      },
    },
  },
};

ButtonSpinnerStory.storyName = 'Button Spinner';