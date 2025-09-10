import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PromptLibrary } from './PromptLibrary'
import { DEFAULT_PROMPTS } from '../../lib/defaultPrompts'
import { PromptService } from '../../lib/promptService'

// Mock PromptService
jest.mock('../../lib/promptService')
const mockPromptService = PromptService as jest.Mocked<typeof PromptService>

describe('PromptLibrary', () => {
  const mockOnSelectPrompt = jest.fn()
  const mockOnClose = jest.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSelectPrompt: mockOnSelectPrompt
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPromptService.getUserPrompts.mockResolvedValue([])
  })

  it('does not render when not open', () => {
    render(<PromptLibrary {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Prompt Library')).not.toBeInTheDocument()
  })

  it('renders prompt library modal with default prompts', () => {
    render(<PromptLibrary {...defaultProps} />)

    expect(screen.getByText('Prompt Library')).toBeInTheDocument()
    expect(screen.getByText('Export "Test Conversation" in the following format:')).toBeInTheDocument()
    expect(screen.getByText('📚 All Prompts')).toBeInTheDocument()
    expect(screen.getByText('✍️ Writing')).toBeInTheDocument()
    expect(screen.getByText('💻 Coding')).toBeInTheDocument()
  })

  it('displays default prompts', () => {
    render(<PromptLibrary {...defaultProps} />)

    expect(screen.getByText('Blog Post Writer')).toBeInTheDocument()
    expect(screen.getByText('Code Debugger')).toBeInTheDocument()
    expect(screen.getByText('Professional Email')).toBeInTheDocument()
  })

  it('filters prompts by category', () => {
    render(<PromptLibrary {...defaultProps} />)

    // Click on Writing category
    fireEvent.click(screen.getByText('✍️ Writing'))

    // Should show writing prompts
    expect(screen.getByText('Blog Post Writer')).toBeInTheDocument()
    expect(screen.getByText('Professional Email')).toBeInTheDocument()

    // Should not show coding prompts
    expect(screen.queryByText('Code Debugger')).not.toBeInTheDocument()
  })

  it('searches prompts by title', () => {
    render(<PromptLibrary {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search prompts...')
    fireEvent.change(searchInput, { target: { value: 'blog' } })

    expect(screen.getByText('Blog Post Writer')).toBeInTheDocument()
    expect(screen.queryByText('Code Debugger')).not.toBeInTheDocument()
  })

  it('searches prompts by content', () => {
    render(<PromptLibrary {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search prompts...')
    fireEvent.change(searchInput, { target: { value: 'debug' } })

    expect(screen.getByText('Code Debugger')).toBeInTheDocument()
    expect(screen.queryByText('Blog Post Writer')).not.toBeInTheDocument()
  })

  it('searches prompts by tags', () => {
    render(<PromptLibrary {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search prompts...')
    fireEvent.change(searchInput, { target: { value: 'SEO' } })

    expect(screen.getByText('Blog Post Writer')).toBeInTheDocument()
    expect(screen.queryByText('Code Debugger')).not.toBeInTheDocument()
  })

  it('selects prompt and calls onSelectPrompt', () => {
    render(<PromptLibrary {...defaultProps} />)

    const useButton = screen.getAllByText('Use This Prompt')[0]
    fireEvent.click(useButton)

    expect(mockOnSelectPrompt).toHaveBeenCalledWith(DEFAULT_PROMPTS[0].content)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('loads custom prompts from database', async () => {
    const customPrompts = [{
      id: 'custom-1',
      title: 'Custom Prompt',
      content: 'Custom content',
      category: 'custom',
      isCustom: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    }]

    mockPromptService.getUserPrompts.mockResolvedValue(customPrompts)

    render(<PromptLibrary {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Custom Prompt')).toBeInTheDocument()
    })
  })

  it('opens create prompt modal', () => {
    render(<PromptLibrary {...defaultProps} />)

    fireEvent.click(screen.getByText('Create Custom'))

    expect(screen.getByText('Create Custom Prompt')).toBeInTheDocument()
  })

  it('creates new custom prompt', async () => {
    const mockCreatedPrompt = {
      id: 'custom-123',
      title: 'My Custom Prompt',
      content: 'This is my custom prompt content.',
      category: 'custom',
      isCustom: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    }

    mockPromptService.createPrompt.mockResolvedValue(mockCreatedPrompt)

    render(<PromptLibrary {...defaultProps} />)

    fireEvent.click(screen.getByText('Create Custom'))

    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText('Enter prompt title'), {
      target: { value: 'My Custom Prompt' }
    })
    fireEvent.change(screen.getByPlaceholderText('Enter your prompt content here...'), {
      target: { value: 'This is my custom prompt content.' }
    })

    fireEvent.click(screen.getByText('Create Prompt'))

    await waitFor(() => {
      expect(mockPromptService.createPrompt).toHaveBeenCalledWith({
        title: 'My Custom Prompt',
        content: 'This is my custom prompt content.',
        category: 'custom',
        description: undefined,
        tags: undefined,
        isCustom: true
      })
      expect(screen.queryByText('Create Custom Prompt')).not.toBeInTheDocument()
    })
  })

  it('cancels creating prompt', () => {
    render(<PromptLibrary {...defaultProps} />)

    fireEvent.click(screen.getByText('Create Custom'))
    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.queryByText('Create Custom Prompt')).not.toBeInTheDocument()
  })

  it('shows empty state when no prompts match search', () => {
    render(<PromptLibrary {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search prompts...')
    fireEvent.change(searchInput, { target: { value: 'nonexistentprompt' } })

    expect(screen.getByText('No prompts found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search or create a custom prompt.')).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', () => {
    render(<PromptLibrary {...defaultProps} />)

    const closeButton = screen.getByLabelText('Close prompt library')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('disables create button when form is incomplete', () => {
    render(<PromptLibrary {...defaultProps} />)

    fireEvent.click(screen.getByText('Create Custom'))

    const createButton = screen.getByText('Create Prompt')
    expect(createButton).toBeDisabled()

    // Fill title but not content
    fireEvent.change(screen.getByPlaceholderText('Enter prompt title'), {
      target: { value: 'Test Title' }
    })

    expect(createButton).toBeDisabled()

    // Fill content
    fireEvent.change(screen.getByPlaceholderText('Enter your prompt content here...'), {
      target: { value: 'Test content' }
    })

    expect(createButton).not.toBeDisabled()
  })

  it('shows prompt preview with truncated content', () => {
    render(<PromptLibrary {...defaultProps} />)

    // Find a prompt with long content
    const longContentPrompt = DEFAULT_PROMPTS.find(p => p.content.length > 100)
    if (longContentPrompt) {
      const promptCard = screen.getByText(longContentPrompt.title).closest('div')
      const contentPreview = promptCard?.querySelector('.line-clamp-3')

      expect(contentPreview).toBeInTheDocument()
      expect(contentPreview?.textContent).toContain('...')
    }
  })

  it('displays prompt tags', () => {
    render(<PromptLibrary {...defaultProps} />)

    // Find a prompt with tags
    const promptWithTags = DEFAULT_PROMPTS.find(p => p.tags && p.tags.length > 0)
    if (promptWithTags) {
      promptWithTags.tags?.slice(0, 3).forEach(tag => {
        expect(screen.getByText(tag)).toBeInTheDocument()
      })
    }
  })
})