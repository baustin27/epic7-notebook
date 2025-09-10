import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExportModal } from './ExportModal'
import { messageService } from '../../lib/database'

// Mock the message service
jest.mock('../../lib/database', () => ({
  messageService: {
    getByConversationId: jest.fn()
  }
}))

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    text: jest.fn(),
    setFontSize: jest.fn(),
    setTextColor: jest.fn(),
    setDrawColor: jest.fn(),
    line: jest.fn(),
    internal: {
      pageSize: { height: 297, width: 210, getWidth: () => 210, getHeight: () => 297 }
    },
    splitTextToSize: jest.fn(() => ['Mocked text']),
    addPage: jest.fn(),
    save: jest.fn()
  }))
})

// Mock URL and document methods for file download
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()
const mockClick = jest.fn()

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
})

Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    click: mockClick,
    href: '',
    download: ''
  }))
})

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
})

describe('ExportModal', () => {
  const mockProps = {
    isOpen: true,
    conversationId: 'conv-1',
    conversationTitle: 'Test Conversation',
    onClose: jest.fn()
  }

  const mockMessages = [
    {
      id: 'msg-1',
      conversation_id: 'conv-1',
      role: 'user',
      content: 'Hello',
      metadata: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'msg-2',
      conversation_id: 'conv-1',
      role: 'assistant',
      content: 'Hi there!',
      metadata: null,
      created_at: '2025-01-01T00:01:00Z',
      updated_at: '2025-01-01T00:01:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(messageService.getByConversationId as jest.Mock).mockResolvedValue(mockMessages)
  })

  it('does not render when not open', () => {
    render(<ExportModal {...mockProps} isOpen={false} />)
    expect(screen.queryByText('Export Conversation')).not.toBeInTheDocument()
  })

  it('renders export modal with format options', async () => {
    render(<ExportModal {...mockProps} />)

    expect(screen.getByText('Export Conversation')).toBeInTheDocument()
    expect(screen.getByText('Export "Test Conversation" in the following format:')).toBeInTheDocument()
    expect(screen.getByLabelText('JSON')).toBeInTheDocument()
    expect(screen.getByLabelText('Markdown')).toBeInTheDocument()
    expect(screen.getByLabelText('PDF')).toBeInTheDocument()
  })

  it('fetches message count on open', async () => {
    render(<ExportModal {...mockProps} />)

    await waitFor(() => {
      expect(messageService.getByConversationId).toHaveBeenCalledWith('conv-1')
    })
  })

  it('shows warning for large conversations', async () => {
    const largeMessages = Array(150).fill(mockMessages[0])
    ;(messageService.getByConversationId as jest.Mock).mockResolvedValue(largeMessages)

    render(<ExportModal {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('Large Conversation Warning')).toBeInTheDocument()
      expect(screen.getByText('This conversation contains 150 messages.')).toBeInTheDocument()
    })
  })

  it('exports JSON format successfully', async () => {
    render(<ExportModal {...mockProps} />)

    fireEvent.click(screen.getByLabelText('JSON'))
    fireEvent.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    expect(mockProps.onClose).toHaveBeenCalled()
  })

  it('exports Markdown format successfully', async () => {
    render(<ExportModal {...mockProps} />)

    fireEvent.click(screen.getByLabelText('Markdown'))
    fireEvent.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    expect(mockProps.onClose).toHaveBeenCalled()
  })

  it('allows PDF format selection', () => {
    render(<ExportModal {...mockProps} />)

    const pdfRadio = screen.getByLabelText('PDF')
    expect(pdfRadio).not.toBeDisabled()

    fireEvent.click(pdfRadio)
    expect(pdfRadio).toBeChecked()
  })

  it('shows progress during export', async () => {
    render(<ExportModal {...mockProps} />)

    fireEvent.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(screen.getByText('Fetching messages...')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Generating JSON export...')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Preparing download...')).toBeInTheDocument()
    })
  })

  it('handles export errors gracefully', async () => {
    ;(messageService.getByConversationId as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<ExportModal {...mockProps} />)

    fireEvent.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    expect(mockProps.onClose).not.toHaveBeenCalled()
  })

  it('closes modal when cancel is clicked', () => {
    render(<ExportModal {...mockProps} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(mockProps.onClose).toHaveBeenCalled()
  })

  it('disables buttons during export', async () => {
    render(<ExportModal {...mockProps} />)

    fireEvent.click(screen.getByText('Export'))

    expect(screen.getByText('Exporting...')).toBeDisabled()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  it('shows completion message before closing', async () => {
    render(<ExportModal {...mockProps} />)

    fireEvent.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(screen.getByText('Export completed!')).toBeInTheDocument()
    })
  })

  it('passes accessibility tests', () => {
    const { container } = render(<ExportModal {...mockProps} />)
    expect(container).toHaveNoViolations()
  })
})