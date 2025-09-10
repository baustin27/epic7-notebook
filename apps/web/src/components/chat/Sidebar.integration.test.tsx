import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from './Sidebar'

// Mock the real-time hooks but allow for more realistic testing
jest.mock('../../hooks/useRealtime', () => ({
  useConversations: jest.fn()
}))

// Mock the database service with more realistic responses
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
const mockUseConversations = useConversations as any
const mockConversationService = conversationService as any

// More realistic test data simulating database state
const initialConversations = [
  {
    id: 'conv-1',
    title: 'Project Planning Discussion',
    updated_at: '2025-01-01T10:00:00Z',
    is_active: true,
    created_at: '2025-01-01T10:00:00Z',
    user_id: 'user-123'
  },
  {
    id: 'conv-2',
    title: 'Technical Architecture Review',
    updated_at: '2025-01-02T15:30:00Z',
    is_active: false,
    created_at: '2025-01-02T15:30:00Z',
    user_id: 'user-123'
  },
  {
    id: 'conv-3',
    title: 'Code Review Feedback',
    updated_at: '2025-01-03T08:00:00Z',
    is_active: true,
    created_at: '2025-01-03T08:00:00Z',
    user_id: 'user-123'
  }
]

describe('Sidebar Integration Tests', () => {
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
    
    // Setup realistic mock implementations
    mockUseConversations.mockReturnValue({
      conversations: initialConversations,
      loading: false
    })
    
    // Mock successful API responses
    mockConversationService.update.mockImplementation(async (id: any, updates: any) => {
      // Simulate successful database update
      return { id, ...updates, updated_at: new Date().toISOString() }
    })
    
    mockConversationService.delete.mockImplementation(async (id: any) => {
      // Simulate successful deletion with delay
      return new Promise(resolve => setTimeout(() => resolve({}), 100))
    })
    
    // Mock window.alert
    jest.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Complete Conversation Management Workflow', () => {
    it('should complete full conversation lifecycle: create → rename → delete', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // 1. STEP: Create new conversation
      const newChatButton = screen.getByRole('button', { name: /create new conversation/i })
      await user.click(newChatButton)
      
      expect(mockOnNewConversation).toHaveBeenCalledTimes(1)
      
      // 2. STEP: Select a conversation for editing
      const conversation = screen.getByText('Project Planning Discussion')
      await user.click(conversation)
      
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-1')
      
      // 3. STEP: Rename the conversation
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      // Edit the conversation title
      const input = screen.getByDisplayValue('Project Planning Discussion')
      await user.clear(input)
      await user.type(input, 'Updated Project Planning')
      
      // Save the edit
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      // Verify the update was called
      await waitFor(() => {
        expect(mockConversationService.update).toHaveBeenCalledWith('conv-1', {
          title: 'Updated Project Planning'
        })
      })
      
      // 4. STEP: Delete the conversation
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      // Confirm deletion
      expect(screen.getByText('Delete Conversation')).toBeInTheDocument()
      const confirmButton = screen.getByText('Delete')
      await user.click(confirmButton)
      
      // Verify deletion was called
      await waitFor(() => {
        expect(mockConversationService.delete).toHaveBeenCalledWith('conv-1')
      })
    })

    it('should handle search → select → edit workflow seamlessly', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // 1. STEP: Search for specific conversation
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      await user.type(searchInput, 'Technical')
      
      // Verify filtered results
      expect(screen.getByText('Technical Architecture Review')).toBeInTheDocument()
      expect(screen.queryByText('Project Planning Discussion')).not.toBeInTheDocument()
      
      // 2. STEP: Select the found conversation
      const foundConversation = screen.getByText('Technical Architecture Review')
      await user.click(foundConversation)
      
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-2')
      
      // 3. STEP: Edit the conversation title directly
      const editButton = screen.getByTitle('Rename conversation')
      await user.click(editButton)
      
      const input = screen.getByDisplayValue('Technical Architecture Review')
      await user.clear(input)
      await user.type(input, 'System Architecture Planning')
      
      // Save by pressing Enter
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockConversationService.update).toHaveBeenCalledWith('conv-2', {
          title: 'System Architecture Planning'
        })
      })
      
      // 4. STEP: Clear search to see all conversations
      await user.clear(searchInput)
      
      // Verify all conversations are visible again
      expect(screen.getByText('Project Planning Discussion')).toBeInTheDocument()
      expect(screen.getByText('Code Review Feedback')).toBeInTheDocument()
    })

    it('should handle keyboard navigation → selection → action workflow', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // 1. STEP: Use keyboard navigation to focus second conversation
      // Focus moves: -1 → 0 → 1
      fireEvent.keyDown(document, { key: 'ArrowDown' })  // Focus index 0
      fireEvent.keyDown(document, { key: 'ArrowDown' })  // Focus index 1
      
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[1]).toHaveAttribute('aria-current', 'true')
        expect(options[1]).toHaveClass('bg-yellow-100')
      })
      
      // 2. STEP: Select using Enter key
      fireEvent.keyDown(document, { key: 'Enter' })
      
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-2')
      
      // 3. STEP: Use mouse interaction to start editing
      const editButton = screen.getAllByTitle('Rename conversation')[1]
      await user.click(editButton)
      
      // 4. STEP: Edit and cancel with Escape
      const input = screen.getByDisplayValue('Technical Architecture Review')
      await user.type(input, ' - DRAFT')
      
      // Cancel edit with Escape
      fireEvent.keyDown(input, { key: 'Escape' })
      
      // Verify edit was cancelled and no API call was made
      await waitFor(() => {
        expect(screen.getByText('Technical Architecture Review')).toBeInTheDocument()
        expect(screen.queryByDisplayValue('Technical Architecture Review - DRAFT')).not.toBeInTheDocument()
      })
      
      expect(mockConversationService.update).not.toHaveBeenCalled()
    })
  })

  describe('Error Recovery Workflows', () => {
    it('should handle edit failure and allow retry', async () => {
      const user = userEvent.setup()
      
      // Mock API failure first, then success
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockConversationService.update
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 'conv-1', title: 'Retry Success' })
      
      render(<Sidebar {...defaultProps} />)
      
      // 1. STEP: Start editing
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(editButton)
      
      const input = screen.getByDisplayValue('Project Planning Discussion')
      await user.clear(input)
      await user.type(input, 'Failed Edit Attempt')
      
      // 2. STEP: Save and expect failure
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update conversation title:', expect.any(Error))
      })
      
      // Component exits edit mode on save (even if failed), showing original title
      expect(screen.getByText('Project Planning Discussion')).toBeInTheDocument()
      
      // 3. STEP: Retry the edit (start new edit session)
      const retryEditButton = screen.getAllByTitle('Rename conversation')[0]
      await user.click(retryEditButton)
      
      const retryInput = screen.getByDisplayValue('Project Planning Discussion')
      await user.clear(retryInput)
      await user.type(retryInput, 'Successful Retry')
      
      const retrySaveButton = screen.getByText('Save')
      await user.click(retrySaveButton)
      
      // Should succeed on retry
      await waitFor(() => {
        expect(mockConversationService.update).toHaveBeenCalledWith('conv-1', {
          title: 'Successful Retry'
        })
      })
      
      consoleSpy.mockRestore()
    })

    it('should handle deletion failure gracefully', async () => {
      const user = userEvent.setup()
      const alertSpy = jest.spyOn(window, 'alert')
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock deletion failure
      mockConversationService.delete.mockRejectedValue(new Error('Delete failed'))
      
      render(<Sidebar {...defaultProps} />)
      
      // 1. STEP: Attempt to delete conversation
      const deleteButton = screen.getAllByTitle('Delete conversation')[0]
      await user.click(deleteButton)
      
      const confirmButton = screen.getByText('Delete')
      await user.click(confirmButton)
      
      // 2. STEP: Verify error handling
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete conversation:', expect.any(Error))
        expect(alertSpy).toHaveBeenCalledWith('Failed to delete conversation. Please try again.')
      })
      
      // Dialog should eventually close (component resets isDeleting state)
      await waitFor(() => {
        // Check that buttons are re-enabled (indicating operation completed)
        const deleteButtons = screen.getAllByTitle('Delete conversation')
        expect(deleteButtons[0]).not.toBeDisabled()
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('Real-time Data Integration', () => {
    it('should handle dynamic conversation updates', async () => {
      const user = userEvent.setup()
      
      // Start with initial conversations
      const { rerender } = render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('Project Planning Discussion')).toBeInTheDocument()
      expect(screen.getAllByRole('option')).toHaveLength(3)
      
      // 1. STEP: Simulate real-time conversation addition
      const updatedConversations = [
        ...initialConversations,
        {
          id: 'conv-4',
          title: 'New Real-time Conversation',
          updated_at: '2025-01-04T12:00:00Z',
          is_active: true,
          created_at: '2025-01-04T12:00:00Z',
          user_id: 'user-123'
        }
      ]
      
      // Update mock to return new conversation list
      mockUseConversations.mockReturnValue({
        conversations: updatedConversations,
        loading: false
      })
      
      // Re-render with updated data
      rerender(<Sidebar {...defaultProps} />)
      
      // 2. STEP: Verify new conversation appears
      expect(screen.getByText('New Real-time Conversation')).toBeInTheDocument()
      expect(screen.getAllByRole('option')).toHaveLength(4)
      
      // 3. STEP: Interact with the new conversation
      const newConversation = screen.getByText('New Real-time Conversation')
      await user.click(newConversation)
      
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-4')
    })

    it('should maintain UI state during loading', async () => {
      const user = userEvent.setup()
      
      // Start with loading state
      mockUseConversations.mockReturnValue({
        conversations: [],
        loading: true
      })
      
      const { rerender } = render(<Sidebar {...defaultProps} />)
      
      // 1. STEP: Verify loading state
      expect(screen.getByText('Loading conversations...')).toBeInTheDocument()
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      
      // 2. STEP: Simulate search during loading (should work)
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      await user.type(searchInput, 'test search')
      
      expect(searchInput).toHaveValue('test search')
      
      // 3. STEP: Complete loading
      mockUseConversations.mockReturnValue({
        conversations: initialConversations,
        loading: false
      })
      
      // Re-render to simulate loading complete
      rerender(<Sidebar {...defaultProps} />)
      
      // 4. STEP: Verify conversations loaded but search filter is still active
      expect(screen.queryByText('Loading conversations...')).not.toBeInTheDocument()
      
      // Clear search to see all conversations
      const clearedSearchInput = screen.getByPlaceholderText('Search conversations...')
      await user.clear(clearedSearchInput)
      
      expect(screen.getByText('Project Planning Discussion')).toBeInTheDocument()
    })
  })

  describe('Accessibility Integration', () => {
    it('should support complete keyboard-only workflow', async () => {
      render(<Sidebar {...defaultProps} />)
      
      // 1. STEP: Navigate with keyboard only
      fireEvent.keyDown(document, { key: 'ArrowDown' })  // Focus first conversation
      
      await waitFor(() => {
        expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-current', 'true')
      })
      
      // 2. STEP: Select with Enter
      fireEvent.keyDown(document, { key: 'Enter' })
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-1')
      
      // 3. STEP: Navigate to second conversation
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      
      await waitFor(() => {
        expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-current', 'true')
      })
      
      // 4. STEP: Clear focus and verify
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        options.forEach(option => {
          expect(option).not.toHaveAttribute('aria-current')
        })
      })
    })

    it('should maintain ARIA states throughout complex interactions', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} selectedConversationId="conv-2" />)
      
      // 1. STEP: Verify initial ARIA states
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'false')
      expect(options[1]).toHaveAttribute('aria-selected', 'true')  // Selected conversation
      expect(options[2]).toHaveAttribute('aria-selected', 'false')
      
      // 2. STEP: Start editing and verify states
      const editButton = screen.getAllByTitle('Rename conversation')[1]
      await user.click(editButton)
      
      // During edit, option should still show selection
      expect(options[1]).toHaveAttribute('aria-selected', 'true')
      
      // 3. STEP: Complete edit and verify states maintained
      const input = screen.getByDisplayValue('Technical Architecture Review')
      await user.type(input, ' Updated')
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      await waitFor(() => {
        const updatedOptions = screen.getAllByRole('option')
        expect(updatedOptions[1]).toHaveAttribute('aria-selected', 'true')
      })
    })
  })

  describe('Performance and State Management', () => {
    it('should handle rapid state changes without conflicts', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)
      
      // 1. STEP: Rapid interaction sequence
      const editButton = screen.getAllByTitle('Rename conversation')[0]
      
      // Start edit and save quickly
      await user.click(editButton)
      const input = screen.getByDisplayValue('Project Planning Discussion')
      await user.clear(input)
      await user.type(input, 'Final Title')
      
      // Save immediately
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      // 2. STEP: Verify final state is correct
      await waitFor(() => {
        expect(mockConversationService.update).toHaveBeenCalledWith('conv-1', {
          title: 'Final Title'
        })
      })
      
      // Should have at least one update call (may be called multiple times due to React batching)
      expect(mockConversationService.update).toHaveBeenCalledWith('conv-1', {
        title: 'Final Title'
      })
    })
  })
})