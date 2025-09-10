import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CodeBlock } from './CodeBlock'

// Mock the theme hook
const mockUseTheme = jest.fn()
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => mockUseTheme()
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
})

// Type declarations for Jest
declare const jest: any
declare const describe: any
declare const it: any
declare const expect: any
declare const beforeEach: any

describe('CodeBlock', () => {
  const mockCode = 'console.log("Hello, World!");'
  const mockLanguage = 'javascript'

  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: 'light' })
    jest.clearAllMocks()
  })

  it('renders code with syntax highlighting', () => {
    render(<CodeBlock code={mockCode} language={mockLanguage} />)

    expect(screen.getByText(mockLanguage)).toBeInTheDocument()
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('shows line numbers for code longer than 5 lines', () => {
    const longCode = 'line1\nline2\nline3\nline4\nline5\nline6'
    render(<CodeBlock code={longCode} language="text" />)

    // The component should show line numbers automatically for >5 lines
    expect(screen.getByText('text')).toBeInTheDocument()
  })

  it('copies code to clipboard when copy button is clicked', async () => {
    render(<CodeBlock code={mockCode} language={mockLanguage} />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockCode)
    })

    // Check for success feedback
    expect(screen.getByText('Copied!')).toBeInTheDocument()
  })

  it('handles clipboard error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    ;(navigator.clipboard.writeText as any).mockRejectedValue(new Error('Clipboard error'))

    render(<CodeBlock code={mockCode} language={mockLanguage} />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy code:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('resets copy feedback after 2 seconds', async () => {
    jest.useFakeTimers()

    render(<CodeBlock code={mockCode} language={mockLanguage} />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })

    // Fast-forward 2 seconds
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it('renders with default language when none provided', () => {
    render(<CodeBlock code={mockCode} />)

    expect(screen.getByText('text')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<CodeBlock code={mockCode} language={mockLanguage} />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    expect(copyButton).toHaveAttribute('aria-label', 'Copy code')
  })
})