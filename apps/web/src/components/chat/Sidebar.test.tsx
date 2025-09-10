import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from './Sidebar'

// Mock dependencies
jest.mock('../../hooks/useRealtime', () => ({
  useConversations: jest.fn()
}))

jest.mock('../../lib/database', () => ({
  conversationService: {
    update: jest.fn(),
    delete: jest.fn()
  }
}))

// Type declarations for Jest
declare const jest: any
declare const describe: any
declare const it: any
declare const expect: any
declare const beforeEach: any
declare const afterEach: any

// Import mocked modules
import { useConversations } from '../../hooks/useRealtime'
import { conversationService } from '../../lib/database'

// Cast to jest mock types
const mockUseConversations = useConversations as jest.MockedFunction<typeof useConversations>
const mockConversationService = conversationService as jest.Mocked<typeof conversationService>

// Sample test data
const mockConversations = [
  {
    id: '1',
    title: 'Test Conversation 1',
    updated_at: '2025-01-01T10:00:00Z',
    is_active: true,
    user_id: 'user-123',
    model: 'gpt-4',
    created_at: '2025-01-01T10:00:00Z'
  },
  {
    id: '2', 
    title: 'Another Chat',
    updated_at: '2025-01-02T15:30:00Z',
    is_active: false,
    user_id: 'user-123',
    model: 'gpt-3.5-turbo',
    created_at: '2025-01-02T15:30:00Z'
  },
  {
    id: '3',
    title: 'Special Characters & Symbols',
    updated_at: '2025-01-03T08:00:00Z',
    is_active: true,
    user_id: 'user-123',
    model: 'claude-3',
    created_at: '2025-01-03T08:00:00Z'
  }
]

describe('Sidebar Component', () => {
  const mockOnSelectConversation = jest.fn()
  const mockOnNewConversation = jest.fn()
  
  const defaultProps = {
    isOpen: true,
    selectedConversationId: null,
    onSelectConversation: mockOnSelectConversation,
    onNewConversation: mockOnNewConversation
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockUseConversations.mockReturnValue({
      conversations: mockConversations,
      loading: false,
      error: null
    })
    
    mockConversationService.update.mockResolvedValue(mockConversations[0])
    mockConversationService.delete.mockResolvedValue(undefined)
    
    // Mock window.alert
    jest.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // 1. Basic Rendering Tests
  describe('Basic Rendering', () => {
    it('renders sidebar when isOpen is true', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('New Chat')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument()
    })

    it('does not render sidebar when isOpen is false', () => {
      render(<Sidebar {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('New Chat')).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Search conversations...')).not.toBeInTheDocument()
    })

    it('displays "New Chat" button', () => {
      render(<Sidebar {...defaultProps} />)
      
      const newChatButton = screen.getByRole('button', { name: /create new conversation/i })
      expect(newChatButton).toBeInTheDocument()
      expect(newChatButton).toHaveClass('bg-blue-600')
    })

    it('displays search input field', () => {
      render(<Sidebar {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'text')
    })

    it('displays conversation counter in footer', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('3 conversations')).toBeInTheDocument()
    })

    it('displays singular conversation counter for single conversation', () => {
      mockUseConversations.mockReturnValue({
        conversations: [mockConversations[0]],
        loading: false,
        error: null
      })
      
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('1 conversation')).toBeInTheDocument()
    })
  })

  // 2. Conversation List Display Tests
  describe('Conversation List Display', () => {
    it('displays loading state when conversations are loading', () => {
      mockUseConversations.mockReturnValue({
        conversations: [],
        loading: true,
        error: null
      })
      
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('Loading conversations...')).toBeInTheDocument()
      
      // Check for loading spinner by class since it doesn't have role="status"
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('animate-spin')
    })

    it('displays "No conversations yet" when no conversations exist', () => {
      mockUseConversations.mockReturnValue({
        conversations: [],
        loading: false,
        error: null
      })
      
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('No conversations yet')).toBeInTheDocument()
    })

    it('displays "No conversations found" when search has no results', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      await act(async () => {
        await user.type(searchInput, 'nonexistent')
      })
      
      expect(screen.getByText('No conversations found')).toBeInTheDocument()
    })

    it('renders conversation list with proper titles and dates', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
      expect(screen.getByText('Another Chat')).toBeInTheDocument()
      expect(screen.getByText('1/1/2025')).toBeInTheDocument()
      expect(screen.getByText('1/2/2025')).toBeInTheDocument()
    })

    it('highlights selected conversation with proper styling', () => {
      render(<Sidebar {...defaultProps} selectedConversationId="1" />)
      
      const selectedConversation = screen.getByText('Test Conversation 1').closest('div')
      expect(selectedConversation?.parentElement?.parentElement).toHaveClass('bg-blue-100', 'dark:bg-blue-900')
      
      const selectedTitle = screen.getByText('Test Conversation 1')
      expect(selectedTitle).toHaveClass('text-blue-900', 'dark:text-blue-100')
    })

    it('shows active status indicator for conversations', () => {
      render(<Sidebar {...defaultProps} />)
      
      // Find status indicators by their unique class combination
      const statusIndicators = document.querySelectorAll('.w-2.h-2.rounded-full')
      
      expect(statusIndicators).toHaveLength(3)
      // First and third conversations are active (green), second is inactive (gray)
      expect(statusIndicators[0]).toHaveClass('bg-green-500')
      expect(statusIndicators[1]).toHaveClass('bg-gray-400') 
      expect(statusIndicators[2]).toHaveClass('bg-green-500')
    })
  })

  // 3. Search Functionality Tests
  describe('Search Functionality', () => {
    it('filters conversations based on search term (case insensitive)', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      await act(async () => {
        await user.type(searchInput, 'test')
      })
      
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
      expect(screen.queryByText('Another Chat')).not.toBeInTheDocument()
    })

    it('updates filtered results when search term changes', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      // Search for "test"
      await act(async () => {
        await user.type(searchInput, 'test')
      })
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
      expect(screen.queryByText('Another Chat')).not.toBeInTheDocument()
      
      // Clear and search for "another"
      await act(async () => {
        await user.clear(searchInput)
        await user.type(searchInput, 'another')
      })
      expect(screen.queryByText('Test Conversation 1')).not.toBeInTheDocument()
      expect(screen.getByText('Another Chat')).toBeInTheDocument()
    })

    it('clears search results when search term is empty', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      // Search for something specific
      await act(async () => {
        await user.type(searchInput, 'test')
      })
      expect(screen.queryByText('Another Chat')).not.toBeInTheDocument()
      
      // Clear search
      await act(async () => {
        await user.clear(searchInput)
      })
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
      expect(screen.getByText('Another Chat')).toBeInTheDocument()
    })

    it('handles special characters in search term', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      await act(async () => {
        await user.type(searchInput, '&')
      })
      
      expect(screen.getByText('Special Characters & Symbols')).toBeInTheDocument()
      expect(screen.queryByText('Test Conversation 1')).not.toBeInTheDocument()
    })
  })

  // 4. New Conversation Tests
  describe('New Conversation', () => {
    it('calls onNewConversation when "New Chat" button is clicked', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const newChatButton = screen.getByRole('button', { name: /create new conversation/i })
      await user.click(newChatButton)
      
      expect(mockOnNewConversation).toHaveBeenCalledTimes(1)
    })

    it('button has proper accessibility attributes', () => {
      render(<Sidebar {...defaultProps} />)
      
      const newChatButton = screen.getByRole('button', { name: /create new conversation/i })
      expect(newChatButton).toBeInTheDocument()
      expect(newChatButton).toHaveAccessibleName('Create new conversation')
    })
  })

  // 5. Conversation Selection Tests
  describe('Conversation Selection', () => {
    it('calls onSelectConversation with correct ID when conversation is clicked', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const conversation = screen.getByText('Test Conversation 1')
      await user.click(conversation)
      
      expect(mockOnSelectConversation).toHaveBeenCalledWith('1')
    })

    it('does not trigger selection when conversation is in edit mode', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // Enter edit mode
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      // Try to click the conversation
      const conversationDiv = screen.getByDisplayValue('Test Conversation 1').closest('.flex-1')
      if (conversationDiv) {
        await user.click(conversationDiv)
      }
      
      expect(mockOnSelectConversation).not.toHaveBeenCalled()
    })

    it('handles null selectedConversationId properly', () => {
      render(<Sidebar {...defaultProps} selectedConversationId={null} />)
      
      // Should not have any highlighted conversations
      const conversations = screen.getAllByText(/Test Conversation|Another Chat|Special Characters/)
      conversations.forEach(conv => {
        expect(conv).not.toHaveClass('text-blue-900', 'dark:text-blue-100')
      })
    })
  })

  // 6. Inline Editing Tests
  describe('Inline Editing', () => {
    it('enters edit mode when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      expect(screen.getByDisplayValue('Test Conversation 1')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('shows input field with current title when editing', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const input = screen.getByDisplayValue('Test Conversation 1')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('saves title on Enter key press', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const input = screen.getByDisplayValue('Test Conversation 1')
      await user.clear(input)
      await user.type(input, 'Updated Title')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockConversationService.update).toHaveBeenCalledWith('1', { title: 'Updated Title' })
      })
    })

    it('cancels edit on Escape key press', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const input = screen.getByDisplayValue('Test Conversation 1')
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Test Conversation 1')).not.toBeInTheDocument()
        expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
      })
    })

    it('saves title on input blur', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const input = screen.getByDisplayValue('Test Conversation 1')
      await user.clear(input)
      await user.type(input, 'Blurred Title')
      
      // Trigger blur by clicking outside
      await user.click(screen.getByText('New Chat'))
      
      await waitFor(() => {
        expect(mockConversationService.update).toHaveBeenCalledWith('1', { title: 'Blurred Title' })
      })
    })

    it('calls conversationService.update with correct parameters', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      expect(mockConversationService.update).toHaveBeenCalledWith('1', { title: 'Test Conversation 1' })
    })

    it('handles edit save success properly', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Test Conversation 1')).not.toBeInTheDocument()
        expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
      })
    })

    it('handles edit save errors with proper error messages', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      mockConversationService.update.mockRejectedValue(new Error('Update failed'))
      
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update conversation title:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
    })

    it('shows save/cancel buttons during edit', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      
      // Buttons should have proper styling
      const saveButton = screen.getByText('Save')
      const cancelButton = screen.getByText('Cancel')
      
      expect(saveButton).toHaveClass('bg-blue-600')
      expect(cancelButton).toHaveClass('bg-gray-500')
    })
  })

  // 7. Deletion Confirmation Tests
  describe('Deletion Confirmation', () => {
    it('shows confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      expect(screen.getByText('Delete Conversation')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete this conversation/)).toBeInTheDocument()
    })

    it('hides confirmation dialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Delete Conversation')).not.toBeInTheDocument()
      })
    })

    it('shows loading state during deletion', async () => {
      const user = userEvent.setup()
      let resolveDelete: (value: void) => void
      const deletePromise = new Promise<void>(resolve => { resolveDelete = resolve })
      mockConversationService.delete.mockReturnValue(deletePromise)
      
      render(<Sidebar {...defaultProps} />)
      
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      const confirmDeleteButton = screen.getByText('Delete')
      await user.click(confirmDeleteButton)
      
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
      
      act(() => {
        resolveDelete!()
      })
    })

    it('disables buttons during deletion process', async () => {
      const user = userEvent.setup()
      let resolveDelete: (value: void) => void
      const deletePromise = new Promise<void>(resolve => { resolveDelete = resolve })
      mockConversationService.delete.mockReturnValue(deletePromise)
      
      render(<Sidebar {...defaultProps} />)
      
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      const confirmDeleteButton = screen.getByText('Delete')
      const cancelButton = screen.getByText('Cancel')
      
      await user.click(confirmDeleteButton)
      
      expect(confirmDeleteButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
      
      act(() => {
        resolveDelete!()
      })
    })

    it('calls conversationService.delete with correct conversation ID', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      const confirmDeleteButton = screen.getByText('Delete')
      await user.click(confirmDeleteButton)
      
      await waitFor(() => {
        expect(mockConversationService.delete).toHaveBeenCalledWith('1')
      })
    })

    it('calls onSelectConversation(null) when deleting selected conversation', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} selectedConversationId="1" />)
      
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      const confirmDeleteButton = screen.getByText('Delete')
      await user.click(confirmDeleteButton)
      
      await waitFor(() => {
        expect(mockOnSelectConversation).toHaveBeenCalledWith(null)
      })
    })

    it('does not call onSelectConversation when deleting non-selected conversation', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} selectedConversationId="2" />)
      
      const deleteButton = screen.getAllByTitle('Delete conversation')[0] // Deleting conversation 1
      await user.click(deleteButton)
      
      const confirmDeleteButton = screen.getByText('Delete')
      await user.click(confirmDeleteButton)
      
      await waitFor(() => {
        expect(mockConversationService.delete).toHaveBeenCalledWith('1')
      })
      
      expect(mockOnSelectConversation).not.toHaveBeenCalled()
    })

    it('handles deletion success properly (closes dialog, clears state)', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      const confirmDeleteButton = screen.getByText('Delete')
      await user.click(confirmDeleteButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Delete Conversation')).not.toBeInTheDocument()
      })
    })

    it('handles deletion errors with proper error messages and alert', async () => {
      const user = userEvent.setup()
      const alertSpy = jest.spyOn(window, 'alert')
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      mockConversationService.delete.mockRejectedValue(new Error('Delete failed'))
      
      render(<Sidebar {...defaultProps} />)
      
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      const confirmDeleteButton = screen.getByText('Delete')
      await user.click(confirmDeleteButton)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete conversation:', expect.any(Error))
        expect(alertSpy).toHaveBeenCalledWith('Failed to delete conversation. Please try again.')
      })
      
      consoleSpy.mockRestore()
    })
  })

  // 8. State Management Tests
  describe('State Management', () => {
    it('manages editingId state correctly', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // Start edit
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      expect(screen.getByDisplayValue('Test Conversation 1')).toBeInTheDocument()
      
      // Cancel edit
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      expect(screen.queryByDisplayValue('Test Conversation 1')).not.toBeInTheDocument()
    })

    it('resets state properly after operations complete', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // Start and complete edit
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Test Conversation 1')).not.toBeInTheDocument()
        expect(screen.queryByText('Save')).not.toBeInTheDocument()
      })
    })
  })

  // 9. Accessibility Tests
  describe('Accessibility', () => {
    it('has proper title attributes for icon buttons', () => {
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getAllByTitle('Rename conversation')[0]).toBeInTheDocument()
      expect(screen.getAllByTitle('Delete conversation')[0]).toBeInTheDocument()
    })

    it('maintains focus management during edit operations', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const input = screen.getByDisplayValue('Test Conversation 1')
      expect(input).toHaveFocus()
    })

    it('provides screen reader friendly content', () => {
      render(<Sidebar {...defaultProps} />)
      
      // Check for semantic elements and accessible text
      expect(screen.getByRole('button', { name: /create new conversation/i })).toBeInTheDocument()
      
      // Search input now has proper ARIA label
      const searchInput = screen.getByRole('textbox', { name: /search conversations/i })
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'text')
    })

    it('has proper listbox structure for keyboard navigation', () => {
      render(<Sidebar {...defaultProps} />)
      
      const listbox = screen.getByRole('listbox', { name: /conversation list/i })
      expect(listbox).toBeInTheDocument()
      expect(listbox).toHaveAttribute('tabIndex', '0')
      
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(3)
      
      // Check selected conversation has proper ARIA attributes
      expect(options[0]).toHaveAttribute('aria-selected', 'false')
    })
  })

  // 10. Keyboard Navigation Tests
  describe('Keyboard Navigation', () => {
    it('highlights conversation on arrow down key', async () => {
      render(<Sidebar {...defaultProps} />)
      
      const listbox = screen.getByRole('listbox')
      
      // Simulate arrow down key
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      await waitFor(() => {
        const firstOption = screen.getAllByRole('option')[0]
        expect(firstOption).toHaveAttribute('aria-current', 'true')
        expect(firstOption).toHaveClass('bg-yellow-100', 'ring-2', 'ring-yellow-300')
      })
    })

    it('navigates down through conversation list', async () => {
      render(<Sidebar {...defaultProps} />)
      
      // First arrow down - focus first item
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[0]).toHaveAttribute('aria-current', 'true')
        expect(options[1]).not.toHaveAttribute('aria-current')
      })
      
      // Second arrow down - focus second item
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[0]).not.toHaveAttribute('aria-current')
        expect(options[1]).toHaveAttribute('aria-current', 'true')
      })
    })

    it('navigates up through conversation list', async () => {
      render(<Sidebar {...defaultProps} />)
      
      // Move to second item
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[1]).toHaveAttribute('aria-current', 'true')
      })
      
      // Arrow up - back to first item
      fireEvent.keyDown(document, { key: 'ArrowUp' })
      
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[0]).toHaveAttribute('aria-current', 'true')
        expect(options[1]).not.toHaveAttribute('aria-current')
      })
    })

    it('selects conversation on Enter key', async () => {
      render(<Sidebar {...defaultProps} />)
      
      // Focus first conversation
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      await waitFor(() => {
        expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-current', 'true')
      })
      
      // Press Enter to select
      fireEvent.keyDown(document, { key: 'Enter' })
      
      expect(mockOnSelectConversation).toHaveBeenCalledWith('1')
    })

    it('clears focus on Escape key', async () => {
      render(<Sidebar {...defaultProps} />)
      
      // Focus first conversation
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      await waitFor(() => {
        expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-current', 'true')
      })
      
      // Press Escape to clear focus
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        options.forEach(option => {
          expect(option).not.toHaveAttribute('aria-current')
        })
      })
    })

    it('stops at boundaries when navigating', async () => {
      render(<Sidebar {...defaultProps} />)
      
      // Try to go up when at top (should stay at -1)
      fireEvent.keyDown(document, { key: 'ArrowUp' })
      
      const options = screen.getAllByRole('option')
      options.forEach(option => {
        expect(option).not.toHaveAttribute('aria-current')
      })
      
      // Move to last item
      fireEvent.keyDown(document, { key: 'ArrowDown' }) // index 0
      fireEvent.keyDown(document, { key: 'ArrowDown' }) // index 1
      fireEvent.keyDown(document, { key: 'ArrowDown' }) // index 2
      
      await waitFor(() => {
        expect(options[2]).toHaveAttribute('aria-current', 'true')
      })
      
      // Try to go down past last item
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      await waitFor(() => {
        // Should still be on last item
        expect(options[2]).toHaveAttribute('aria-current', 'true')
      })
    })

    it('disables keyboard navigation while editing', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // Start editing first conversation
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      // Try keyboard navigation - should not work
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      const options = screen.getAllByRole('option')
      options.forEach(option => {
        expect(option).not.toHaveAttribute('aria-current')
      })
    })

    it('resets focus when search changes conversations', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // Focus first conversation
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      await waitFor(() => {
        expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-current', 'true')
      })
      
      // Change search term
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      await act(async () => {
        await user.type(searchInput, 'test')
      })
      
      // Focus should be reset
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        options.forEach(option => {
          expect(option).not.toHaveAttribute('aria-current')
        })
      })
    })
  })
})