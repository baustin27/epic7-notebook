import type { Meta, StoryObj } from '@storybook/react';
import { MessageInput } from './MessageInput';

// Mock the required services and hooks
jest.mock('../../lib/database', () => ({
  conversationService: {
    create: jest.fn().mockResolvedValue({ id: 'mock-conversation-id', title: 'New Chat' }),
    getById: jest.fn().mockResolvedValue({ id: 'mock-conversation-id', title: 'New Chat' }),
    update: jest.fn().mockResolvedValue({}),
  },
  messageService: {
    create: jest.fn().mockResolvedValue({ id: 'mock-message-id', content: 'Mock message' }),
  },
}));

jest.mock('../../lib/ai-service', () => ({
  aiService: {
    validateMessage: jest.fn().mockReturnValue({ valid: true }),
    processMessage: jest.fn().mockResolvedValue('Mock AI response'),
    generateTitle: jest.fn().mockResolvedValue('Generated Title'),
  },
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } } }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://mock-url.com' } }),
      }),
    },
  },
}));

jest.mock('../../lib/promptService', () => ({
  PromptService: {
    createPrompt: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../lib/analyticsService', () => ({
  analyticsService: {
    trackEvent: jest.fn(),
    trackFeatureUsage: jest.fn(),
    updateUserEngagement: jest.fn(),
    incrementConversationCount: jest.fn(),
    incrementMessageCount: jest.fn(),
    trackModelUsage: jest.fn(),
  },
}));

jest.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}));

jest.mock('../../hooks/useErrorHandling', () => ({
  useErrorHandling: () => ({
    handleError: jest.fn().mockReturnValue({ message: 'Mock error message' }),
  }),
}));

jest.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    error: jest.fn(),
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'mock-user-id', email: 'mock@example.com' },
  }),
}));

const meta: Meta<typeof MessageInput> = {
  title: 'Chat/MessageInput',
  component: MessageInput,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Message input component with file upload, prompt library, and AI integration.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    conversationId: {
      control: { type: 'text' },
      description: 'ID of the current conversation',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MessageInput>;

export const Default: Story = {
  args: {
    conversationId: null,
    onConversationCreated: (id: string) => console.log('Conversation created:', id),
  },
};

export const WithExistingConversation: Story = {
  args: {
    conversationId: 'existing-conversation-id',
    onConversationCreated: (id: string) => console.log('Conversation created:', id),
  },
};

export const Loading: Story = {
  args: {
    conversationId: 'existing-conversation-id',
    onConversationCreated: (id: string) => console.log('Conversation created:', id),
  },
  parameters: {
    docs: {
      description: {
        story: 'Message input in loading state (simulated by component state).',
      },
    },
  },
};