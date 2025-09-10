import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import { ChatInterface } from './ChatInterface'
import { AuthProvider } from '../../contexts/SimpleAuthContext'
import { conversationService } from '../lib/database'
import type { User } from '@supabase/supabase-js'
import type { Toast } from '../hooks/useToast'

// Mock the hooks
jest.mock('../hooks/useErrorHandling')
jest.mock('../hooks/useToast')
jest.mock('../lib/database')

// Mock child components
jest.mock('./layout/Header', () => ({
  Header: ({ onToggleSidebar, sidebarOpen }: any) => (
    <header data-testid="header">
      <button onClick={onToggleSidebar} data-testid="toggle-sidebar">
        Toggle {sidebarOpen ? 'Close' : 'Open'}
      </button>
    </header>
  )
}))

jest.mock('./chat/Sidebar', () => ({
  Sidebar: ({ onNewConversation, isCreating }: any) => (
    <div data-testid="sidebar">
      <button
        onClick={onNewConversation}
        disabled={isCreating}
        data-testid="new-conversation-btn"
      >
        {isCreating ? 'Creating...' : 'New Chat'}
      </button>
    </div>
  )
}))

jest.mock('./chat/ChatArea', () => ({
  ChatArea: ({ conversationId }: any) => (
    <div data-testid="chat-area">
      Chat Area {conversationId ? `for ${conversationId}` : 'No conversation'}
    </div>
  )
}))

jest.mock('./chat/MessageInput', () => ({
  MessageInput: ({ conversationId, onConversationCreated }: any) => (
    <div data-testid="message-input">
      Message Input {conversationId ? `for ${conversationId}` : 'No conversation'}
    </div>
  )
}))

jest.mock('./ui/Toast', () => ({
  ToastContainer: ({ toasts, onRemove }: any) => (
    <div data-testid="toast-container">
      {toasts?.map((toast: any) => (
        <div key={toast.id} data-testid={`toast-${toast.id}`}>
          {toast.message}
          <button onClick={() => onRemove(toast.id)}>Close</button>
        </div>
      ))}
    </div>
  )
}))

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString()
} as User

const mockHandleError = jest.fn()
const mockUseErrorHandling = jest.fn(() => ({ handleError: mockHandleError }))

const mockUseToast = jest.fn(() => ({
  toasts: [],
  error: jest.fn(),
  success: jest.fn(),
  removeToast: jest.fn()
}))

const mockConversationService = {
  create: jest.fn()
}

describe('ChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(require('../hooks/useErrorHandling') as any).default = mockUseErrorHandling
    ;(require('../hooks/useToast') as any).default = mockUseToast
    ;(require('../lib/database') as any).conversationService = mockConversationService
  })

  const renderWithAuth = (user: User | null = mockUser) => {
    // Mock the supabase client to avoid actual auth calls
    jest.mock('../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
          onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
        }
      }
    }))

    return render(
      <AuthProvider>
        <ChatInterface />
      </AuthProvider>
    )
  }

  describe('Rendering', () => {
    it('renders all main components', () => {
      renderWithAuth()

      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('chat-area')).toBeInTheDocument()
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
      expect(screen.getByTestId('toast-container')).toBeInTheDocument()
    })

    it('renders with sidebar open by default', () => {
      renderWithAuth()

      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('toggle-sidebar')).toHaveTextContent('Toggle Close')
    })

    it('passes correct props to child components', () => {
      renderWithAuth()

      expect(screen.getByTestId('chat-area')).toHaveTextContent('No conversation')
      expect(screen.getByTestId('message-input')).toHaveTextContent('No conversation')
    })
  })

  describe('Sidebar Toggle', () => {
    it('toggles sidebar visibility when header button is clicked', () => {
      renderWithAuth()

      const toggleButton = screen.getByTestId('toggle-sidebar')
      expect(toggleButton).toHaveTextContent('Toggle Close')

      fireEvent.click(toggleButton)
      expect(toggleButton).toHaveTextContent('Toggle Open')

      // Sidebar should be hidden
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()

      fireEvent.click(toggleButton)
      expect(toggleButton).toHaveTextContent('Toggle Close')
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })
  })

  describe('New Conversation', () => {
    it('creates new conversation successfully when user is authenticated', async () => {
      const mockConversation = { id: 'conv-1', title: 'New Chat' }
      mockConversationService.create.mockResolvedValue(mockConversation)

      renderWithAuth()

      const newChatButton = screen.getByTestId('new-conversation-btn')
      fireEvent.click(newChatButton)

      await waitFor(() => {
        expect(mockConversationService.create).toHaveBeenCalledWith('New Chat')
      })

      // Check that conversation ID is updated
      expect(screen.getByTestId('chat-area')).toHaveTextContent('for conv-1')
      expect(screen.getByTestId('message-input')).toHaveTextContent('for conv-1')
    })

    it('shows error when user is not authenticated', () => {
      const mockError = jest.fn()
      mockUseToast.mockReturnValue({
        toasts: [],
        error: mockError,
        success: jest.fn(),
        removeToast: jest.fn()
      })

      renderWithAuth(null)

      const newChatButton = screen.getByTestId('new-conversation-btn')
      fireEvent.click(newChatButton)

      expect(mockError).toHaveBeenCalledWith('Authentication Required', {
        title: 'Please sign in to continue',
        duration: 4000
      })
      expect(mockConversationService.create).not.toHaveBeenCalled()
    })

    it('handles conversation creation errors', async () => {
      const mockError = new Error('Database error')
      mockConversationService.create.mockRejectedValue(mockError)

      const mockToastError = jest.fn()
      mockUseToast.mockReturnValue({
        toasts: [],
        error: mockToastError,
        success: jest.fn(),
        removeToast: jest.fn()
      })

      renderWithAuth()

      const newChatButton = screen.getByTestId('new-conversation-btn')
      fireEvent.click(newChatButton)

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(mockError)
        expect(mockToastError).toHaveBeenCalled()
      })
    })

    it('shows loading state during conversation creation', () => {
      mockConversationService.create.mockImplementation(() => new Promise(() => {})) // Never resolves

      renderWithAuth()

      const newChatButton = screen.getByTestId('new-conversation-btn')
      fireEvent.click(newChatButton)

      expect(newChatButton).toHaveTextContent('Creating...')
      expect(newChatButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderWithAuth()
      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  describe('Toast Management', () => {
    it('renders toast container', () => {
      renderWithAuth()
      expect(screen.getByTestId('toast-container')).toBeInTheDocument()
    })
  })
})