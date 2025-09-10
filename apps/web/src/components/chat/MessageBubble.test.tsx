import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageBubble } from './MessageBubble'
import type { Database } from '../../types/database'

// Mock the auth context
const mockUseAuth = jest.fn()
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}))

// Type declarations for Jest
declare const jest: any
declare const describe: any
declare const it: any
declare const expect: any
declare const beforeEach: any

type Message = Database['public']['Tables']['messages']['Row']

const mockMessage: Message = {
  id: '1',
  conversation_id: 'conv-1',
  role: 'user',
  content: 'Test message',
  metadata: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

const mockUser = { id: 'user-1', email: 'test@example.com' }

describe('MessageBubble', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: mockUser })
  })

  it('renders message content', () => {
    render(<MessageBubble message={mockMessage} />)
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('shows edit and delete buttons on hover for user messages', async () => {
    render(<MessageBubble message={mockMessage} />)
    const container = screen.getByText('Test message').closest('div')

    // Initially buttons should not be visible
    expect(screen.queryByText('Edit')).not.toBeVisible()
    expect(screen.queryByText('Delete')).not.toBeVisible()

    // Simulate hover
    fireEvent.mouseEnter(container!)

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeVisible()
      expect(screen.getByText('Delete')).toBeVisible()
    })
  })

  it('enters edit mode when edit button is clicked', async () => {
    render(<MessageBubble message={mockMessage} />)
    const container = screen.getByText('Test message').closest('div')

    fireEvent.mouseEnter(container!)
    fireEvent.click(screen.getByText('Edit'))

    await waitFor(() => {
      const textarea = screen.getByDisplayValue('Test message')
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
    })
  })

  it('shows delete confirmation dialog', async () => {
    render(<MessageBubble message={mockMessage} />)
    const container = screen.getByText('Test message').closest('div')

    fireEvent.mouseEnter(container!)
    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete this message?')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  it('calls onEdit when saving edited message', async () => {
    const mockOnEdit = jest.fn()
    render(<MessageBubble message={mockMessage} onEdit={mockOnEdit} />)
    const container = screen.getByText('Test message').closest('div')

    fireEvent.mouseEnter(container!)
    fireEvent.click(screen.getByText('Edit'))

    const textarea = screen.getByDisplayValue('Test message')
    fireEvent.change(textarea, { target: { value: 'Edited message' } })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockOnEdit).toHaveBeenCalledWith('1', 'Edited message')
    })
  })

  it('calls onDelete when confirming deletion', async () => {
    const mockOnDelete = jest.fn()
    render(<MessageBubble message={mockMessage} onDelete={mockOnDelete} />)
    const container = screen.getByText('Test message').closest('div')

    fireEvent.mouseEnter(container!)
    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1')
    })
  })

  it('shows edited indicator when message was updated', () => {
    const editedMessage = {
      ...mockMessage,
      updated_at: '2025-01-01T00:01:00Z'
    }
    render(<MessageBubble message={editedMessage} />)
    expect(screen.getByText('(edited)')).toBeInTheDocument()
  })

  it('does not show edit/delete buttons for non-user messages', () => {
    const systemMessage = { ...mockMessage, role: 'assistant' as const }
    render(<MessageBubble message={systemMessage} />)
    const container = screen.getByText('Test message').closest('div')

    fireEvent.mouseEnter(container!)

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('renders code blocks with syntax highlighting', () => {
    const messageWithCode = {
      ...mockMessage,
      content: 'Here is some code:\n```javascript\nconsole.log("Hello");\n```'
    }
    render(<MessageBubble message={messageWithCode} />)

    expect(screen.getByText('Here is some code:')).toBeInTheDocument()
    expect(screen.getByText('javascript')).toBeInTheDocument()
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('renders mixed content with text and code blocks', () => {
    const mixedContent = {
      ...mockMessage,
      content: 'Before code\n```python\nprint("hello")\n```\nAfter code'
    }
    render(<MessageBubble message={mixedContent} />)

    expect(screen.getByText('Before code')).toBeInTheDocument()
    expect(screen.getByText('python')).toBeInTheDocument()
    expect(screen.getByText('After code')).toBeInTheDocument()
  })

  it('renders plain text messages without code blocks unchanged', () => {
    render(<MessageBubble message={mockMessage} />)

    expect(screen.getByText('Test message')).toBeInTheDocument()
  })
})