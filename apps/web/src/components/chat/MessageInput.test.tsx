import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageInput } from './MessageInput'
import { useWritingAssistant } from '../../hooks/useWritingAssistant'
import { WritingAssistantOverlay } from '../ui/WritingAssistantOverlay'

// Mock the required modules
jest.mock('../../lib/database', () => ({
  conversationService: {
    create: jest.fn().mockResolvedValue({ id: 'test-conversation-id' })
  },
  messageService: {
    create: jest.fn().mockResolvedValue({ id: 'test-message-id' })
  }
}))

jest.mock('../../lib/ai-service', () => ({
  aiService: {
    validateMessage: jest.fn().mockReturnValue({ valid: true }),
    processMessage: jest.fn().mockResolvedValue('Test response')
  }
}))

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/image.jpg' } })
      })
    }
  }
}))

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({
    user: { id: 'test-user-id' },
    loading: false
  })
}))

jest.mock('../../hooks/useWritingAssistant', () => ({
  useWritingAssistant: jest.fn().mockReturnValue({
    grammarSuggestions: [],
    toneAnalysis: null,
    contentSuggestions: [],
    isLoading: false,
    error: null
  })
}))

jest.mock('../ui/WritingAssistantOverlay', () => ({
  WritingAssistantOverlay: jest.fn().mockReturnValue(null)
}))

describe('MessageInput', () => {
  const mockOnConversationCreated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the message input form', () => {
    render(<MessageInput conversationId={null} onConversationCreated={mockOnConversationCreated} />)

    expect(screen.getByPlaceholderText(/Type your message/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send message/ })).toBeInTheDocument()
  })

  it('shows file upload button', () => {
    render(<MessageInput conversationId={null} onConversationCreated={mockOnConversationCreated} />)

    const uploadButton = screen.getByLabelText('Upload image')
    expect(uploadButton).toBeInTheDocument()
  })

  it('validates file type correctly', async () => {
    render(<MessageInput conversationId={null} onConversationCreated={mockOnConversationCreated} />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Upload image')

    // Mock the file input change
    Object.defineProperty(input, 'files', {
      value: [file]
    })

    fireEvent.change(input)

    // Should not show error for valid file
    await waitFor(() => {
      expect(screen.queryByText(/Only JPEG, PNG, GIF, and WebP/)).not.toBeInTheDocument()
    })
  })

  it('rejects invalid file types', async () => {
    render(<MessageInput conversationId={null} onConversationCreated={mockOnConversationCreated} />)

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const input = screen.getByLabelText('Upload image')

    Object.defineProperty(input, 'files', {
      value: [file]
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(screen.getByText(/Only JPEG, PNG, GIF, and WebP images are allowed/)).toBeInTheDocument()
    })
  })

  it('rejects files over size limit', async () => {
    render(<MessageInput conversationId={null} onConversationCreated={mockOnConversationCreated} />)

    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Upload image')

    Object.defineProperty(input, 'files', {
      value: [largeFile]
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(screen.getByText(/File size must be less than 10MB/)).toBeInTheDocument()
    })
  })

  it('shows image preview when file is selected', async () => {
    render(<MessageInput conversationId={null} onConversationCreated={mockOnConversationCreated} />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Upload image')

    Object.defineProperty(input, 'files', {
      value: [file]
    })

    fireEvent.change(input)

    await waitFor(() => {
      const preview = screen.getByAltText('Preview')
      expect(preview).toBeInTheDocument()
    })
  })

  it('allows removing selected file', async () => {
    render(<MessageInput conversationId={null} onConversationCreated={mockOnConversationCreated} />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Upload image')

    Object.defineProperty(input, 'files', {
      value: [file]
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument()
    })

    const removeButton = screen.getByLabelText('Remove image')
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument()
    })
  })

  it('enables send button when message or file is present', async () => {
    render(<MessageInput conversationId={null} onConversationCreated={mockOnConversationCreated} />)

    const sendButton = screen.getByRole('button', { name: /Send message/ })

    // Initially disabled
    expect(sendButton).toBeDisabled()

    // Add message
    const textarea = screen.getByPlaceholderText(/Type your message/)
    fireEvent.change(textarea, { target: { value: 'Test message' } })

    expect(sendButton).not.toBeDisabled()

    // Clear message and add file
    fireEvent.change(textarea, { target: { value: '' } })
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Upload image')

    Object.defineProperty(input, 'files', {
      value: [file]
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
  })

  describe('Writing Assistant Integration', () => {
    const mockUseWritingAssistant = useWritingAssistant as jest.MockedFunction<typeof useWritingAssistant>
    const mockWritingAssistantOverlay = WritingAssistantOverlay as jest.MockedFunction<typeof WritingAssistantOverlay>

    beforeEach(() => {
      mockUseWritingAssistant.mockReturnValue({
        grammarSuggestions: [],
        toneAnalysis: null,
        contentSuggestions: [],
        isLoading: false,
        error: null
      })
      mockWritingAssistantOverlay.mockClear()
    })

    it('renders writing assistant toggle button', () => {
      render(<MessageInput conversationId={null} onConversationCreated={mockOnConversationCreated} />)

      const toggleButton = screen.getByLabelText('Enable writing assistant')
      expect(toggleButton).toBeInTheDocument()
    })

    it('passes writing assistant data to overlay component', () => {
      const mockResult = {
        grammarSuggestions: [{
          type: 'grammar' as const,
          original: 'teh',
          suggestion: 'the',
          explanation: 'Spelling correction',
          position: { start: 0, end: 3 }
        }],
        toneAnalysis: {
          currentTone: 'casual' as const,
          confidence: 0.8,
          suggestions: ['Use more formal language']
        },
        contentSuggestions: [{
          type: 'completion' as const,
          text: 'and complete the thought',
          relevance: 0.9,
          context: 'Completes the sentence'
        }],
        isLoading: false,
        error: null
      }

      mockUseWritingAssistant.mockReturnValue(mockResult)

      render(<MessageInput conversationId="test-conversation" onConversationCreated={mockOnConversationCreated} />)

      expect(mockWritingAssistantOverlay).toHaveBeenCalledWith(
        expect.objectContaining({
          grammarSuggestions: mockResult.grammarSuggestions,
          toneAnalysis: mockResult.toneAnalysis,
          contentSuggestions: mockResult.contentSuggestions,
          isLoading: false,
          error: null
        }),
        expect.any(Object)
      )
    })

    it('toggles writing assistant on and off', () => {
      render(<MessageInput conversationId="test-conversation" onConversationCreated={mockOnConversationCreated} />)

      const toggleButton = screen.getByLabelText('Enable writing assistant')

      // Initially enabled
      expect(toggleButton).toHaveAttribute('aria-label', 'Enable writing assistant')

      // Click to disable
      fireEvent.click(toggleButton)
      expect(toggleButton).toHaveAttribute('aria-label', 'Disable writing assistant')

      // Click to enable again
      fireEvent.click(toggleButton)
      expect(toggleButton).toHaveAttribute('aria-label', 'Enable writing assistant')
    })

    it('calls useWritingAssistant with correct parameters', () => {
      render(<MessageInput conversationId="test-conversation" onConversationCreated={mockOnConversationCreated} />)

      expect(mockUseWritingAssistant).toHaveBeenCalledWith(
        '', // initial empty message
        'test-conversation',
        expect.objectContaining({
          enabled: true,
          debounceMs: 300
        })
      )
    })

    it('updates writing assistant when message changes', () => {
      mockUseWritingAssistant.mockClear()

      render(<MessageInput conversationId="test-conversation" onConversationCreated={mockOnConversationCreated} />)

      const textarea = screen.getByPlaceholderText(/Type your message/)
      fireEvent.change(textarea, { target: { value: 'Test message for analysis' } })

      expect(mockUseWritingAssistant).toHaveBeenCalledWith(
        'Test message for analysis',
        'test-conversation',
        expect.any(Object)
      )
    })

    it('shows loading state when writing assistant is analyzing', () => {
      mockUseWritingAssistant.mockReturnValue({
        grammarSuggestions: [],
        toneAnalysis: null,
        contentSuggestions: [],
        isLoading: true,
        error: null
      })

      render(<MessageInput conversationId="test-conversation" onConversationCreated={mockOnConversationCreated} />)

      expect(mockWritingAssistantOverlay).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: true
        }),
        expect.any(Object)
      )
    })

    it('displays writing assistant errors', () => {
      mockUseWritingAssistant.mockReturnValue({
        grammarSuggestions: [],
        toneAnalysis: null,
        contentSuggestions: [],
        isLoading: false,
        error: 'API Error'
      })

      render(<MessageInput conversationId="test-conversation" onConversationCreated={mockOnConversationCreated} />)

      expect(mockWritingAssistantOverlay).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'API Error'
        }),
        expect.any(Object)
      )
    })
  })
})