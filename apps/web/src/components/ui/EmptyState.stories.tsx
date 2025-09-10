import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState, SearchEmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Empty state components for different scenarios with customizable content and actions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['new-user', 'no-conversations', 'search-results', 'network-error', 'no-messages', 'custom'],
      description: 'Predefined empty state type',
    },
    title: {
      control: { type: 'text' },
      description: 'Custom title (for custom type)',
    },
    description: {
      control: { type: 'text' },
      description: 'Custom description (for custom type)',
    },
    actionLabel: {
      control: { type: 'text' },
      description: 'Custom action button label',
    },
    illustration: {
      control: { type: 'text' },
      description: 'Custom illustration (emoji or React node)',
    },
    compact: {
      control: { type: 'boolean' },
      description: 'Whether to use compact layout',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const NewUser: Story = {
  args: {
    type: 'new-user',
  },
};

export const NoConversations: Story = {
  args: {
    type: 'no-conversations',
  },
};

export const SearchResults: Story = {
  args: {
    type: 'search-results',
  },
};

export const NetworkError: Story = {
  args: {
    type: 'network-error',
  },
};

export const NoMessages: Story = {
  args: {
    type: 'no-messages',
  },
};

export const Custom: Story = {
  args: {
    type: 'custom',
    title: 'Custom Empty State',
    description: 'This is a custom empty state with custom content and illustration.',
    actionLabel: 'Custom Action',
    illustration: '🎨',
  },
};

export const Compact: Story = {
  args: {
    type: 'new-user',
    compact: true,
  },
};

export const WithAction: Story = {
  args: {
    type: 'custom',
    title: 'Action Required',
    description: 'You need to take an action to continue.',
    actionLabel: 'Take Action',
    illustration: '⚡',
  },
};

export const CustomIllustration: Story = {
  args: {
    type: 'custom',
    title: 'Creative Space',
    description: 'Your creative workspace is ready for new ideas.',
    actionLabel: 'Start Creating',
    illustration: '🎨',
  },
};

// Search Empty State Stories
export const SearchEmptyStateStory: StoryObj<typeof SearchEmptyState> = {
  render: (args) => <SearchEmptyState {...args} />,
  args: {
    query: 'react components',
    suggestions: ['button', 'input', 'modal', 'loading spinner'],
  },
  argTypes: {
    query: {
      control: { type: 'text' },
      description: 'The search query that returned no results',
    },
    suggestions: {
      control: { type: 'object' },
      description: 'Array of suggested search terms',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Specialized empty state for search results with suggestions.',
      },
    },
  },
};

SearchEmptyStateStory.storyName = 'Search Empty State';

export const SearchEmptyStateWithSuggestions: Story = {
  render: (args) => <SearchEmptyState {...args} />,
  args: {
    query: 'advanced filters',
    suggestions: ['date range', 'status filter', 'category filter', 'priority level'],
  },
};

export const SearchEmptyStateNoSuggestions: Story = {
  render: (args) => <SearchEmptyState {...args} />,
  args: {
    query: 'xyz123',
    suggestions: [],
  },
};