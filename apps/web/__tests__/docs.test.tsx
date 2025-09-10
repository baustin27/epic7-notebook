import React from 'react'
import { render, screen } from '@testing-library/react'
import { ApiPlayground } from '../src/components/docs/ApiPlayground'
import { CodeExample } from '../src/components/docs/CodeExample'

// Mock fetch for API playground tests
global.fetch = jest.fn()

describe('Documentation Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ApiPlayground', () => {
    const mockEndpoints: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'DELETE'
      path: string
      description: string
      body?: object
    }> = [
      {
        method: 'GET',
        path: '/conversations',
        description: 'List user conversations'
      },
      {
        method: 'POST',
        path: '/conversations',
        description: 'Create a new conversation',
        body: { title: 'Test Chat' }
      }
    ]

    it('renders endpoint selector', () => {
      render(<ApiPlayground endpoints={mockEndpoints} />)

      expect(screen.getByText('API Playground')).toBeInTheDocument()
      expect(screen.getByText('Select Endpoint')).toBeInTheDocument()
    })

    it('displays endpoint information', () => {
      render(<ApiPlayground endpoints={mockEndpoints} />)

      expect(screen.getByText('Test API endpoints directly from the documentation')).toBeInTheDocument()
    })

    it('shows request body input for POST endpoints', () => {
      render(<ApiPlayground endpoints={mockEndpoints} />)

      // Select POST endpoint (second option, index 1)
      const select = screen.getByRole('combobox') as HTMLSelectElement
      select.value = '1'
      select.dispatchEvent(new Event('change', { bubbles: true }))

      expect(screen.getByText('Request Body (JSON)')).toBeInTheDocument()
    })
  })

  describe('CodeExample', () => {
    const sampleCode = `const greeting = "Hello, World!";
console.log(greeting);`

    it('renders code with syntax highlighting', () => {
      render(
        <CodeExample
          title="Sample Code"
          description="A simple example"
          code={sampleCode}
          language="javascript"
        />
      )

      expect(screen.getByText('Sample Code')).toBeInTheDocument()
      expect(screen.getByText('A simple example')).toBeInTheDocument()
      expect(screen.getByText(sampleCode)).toBeInTheDocument()
    })

    it('shows copy button', () => {
      render(<CodeExample code={sampleCode} />)

      expect(screen.getByText('Copy')).toBeInTheDocument()
    })

    it('shows execute button when executable', () => {
      const mockOnExecute = jest.fn().mockResolvedValue('Output result')

      render(
        <CodeExample
          code={sampleCode}
          executable={true}
          onExecute={mockOnExecute}
        />
      )

      expect(screen.getByText('Run')).toBeInTheDocument()
    })
  })
})

describe('Documentation Pages', () => {
  it('validates documentation structure', () => {
    // This would be expanded to test actual documentation files
    // For now, just validate that our components can be imported
    expect(ApiPlayground).toBeDefined()
    expect(CodeExample).toBeDefined()
  })
})