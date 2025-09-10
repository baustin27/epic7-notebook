import { renderHook, act, waitFor } from '@testing-library/react'
import { useWritingAssistant } from '../useWritingAssistant'

// Mock the OpenRouter API
jest.mock('../../lib/openrouter', () => ({
  openRouterAPI: {
    chatCompletion: jest.fn()
  }
}))

import { openRouterAPI } from '../../lib/openrouter'

const mockChatCompletion = openRouterAPI.chatCompletion as jest.MockedFunction<typeof openRouterAPI.chatCompletion>

describe('useWritingAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns empty suggestions for short text', () => {
    const { result } = renderHook(() => useWritingAssistant('hi', 'test-conversation'))

    expect(result.current.grammarSuggestions).toEqual([])
    expect(result.current.toneAnalysis).toBeNull()
    expect(result.current.contentSuggestions).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('does not call API when disabled', () => {
    const { result } = renderHook(() =>
      useWritingAssistant('This is a longer message that should trigger analysis', 'test-conversation', {
        enabled: false
      })
    )

    expect(mockChatCompletion).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('calls API and processes response correctly', async () => {
    const mockResponse = {
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [{
        index: 0,
        message: {
          role: 'assistant' as const,
          content: JSON.stringify({
            grammarSuggestions: [{
              type: 'grammar',
              original: 'teh',
              suggestion: 'the',
              explanation: 'Corrected spelling',
              position: { start: 0, end: 3 }
            }],
            toneAnalysis: {
              currentTone: 'casual',
              confidence: 0.8,
              suggestions: ['Consider using more formal language']
            },
            contentSuggestions: [{
              type: 'completion',
              text: 'and how it works',
              relevance: 0.9,
              context: 'Completes the thought about the topic'
            }]
          })
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    }

    mockChatCompletion.mockResolvedValue(mockResponse)

    const { result } = renderHook(() =>
      useWritingAssistant('This is teh message', 'test-conversation')
    )

    // Initially should be loading
    expect(result.current.isLoading).toBe(true)

    // Fast-forward debounce timer
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Wait for the API call to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockChatCompletion).toHaveBeenCalledTimes(1)
    expect(result.current.grammarSuggestions).toHaveLength(1)
    expect(result.current.grammarSuggestions[0].suggestion).toBe('the')
    expect(result.current.toneAnalysis?.currentTone).toBe('casual')
    expect(result.current.contentSuggestions).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('handles API errors gracefully', async () => {
    mockChatCompletion.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() =>
      useWritingAssistant('This is a test message for analysis', 'test-conversation')
    )

    // Fast-forward debounce timer
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('API Error')
    expect(result.current.grammarSuggestions).toEqual([])
  })

  it('handles invalid JSON response', async () => {
    const mockResponse = {
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [{
        index: 0,
        message: {
          role: 'assistant' as const,
          content: 'Invalid JSON response'
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    }

    mockChatCompletion.mockResolvedValue(mockResponse)

    const { result } = renderHook(() =>
      useWritingAssistant('This is a test message', 'test-conversation')
    )

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to parse suggestions')
  })

  it('respects debounce timing', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useWritingAssistant(text, 'test-conversation'),
      { initialProps: { text: 'Initial text' } }
    )

    // Change text before debounce timer expires
    rerender({ text: 'Updated text' })

    // Should still be loading from first call
    expect(result.current.isLoading).toBe(true)

    // Advance timer partially
    act(() => {
      jest.advanceTimersByTime(150)
    })

    // Change text again
    rerender({ text: 'Final text' })

    // Advance timer to complete debounce
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Should have made only one API call (debounced)
    expect(mockChatCompletion).toHaveBeenCalledTimes(1)
    expect(mockChatCompletion).toHaveBeenCalledWith(
      expect.any(Array),
      'gpt-3.5-turbo',
      undefined,
      undefined,
      expect.objectContaining({
        temperature: 0.3,
        maxTokens: 1000
      })
    )
  })

  it('uses cached results when available', async () => {
    const mockResponse = {
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [{
        index: 0,
        message: {
          role: 'assistant' as const,
          content: JSON.stringify({
            grammarSuggestions: [],
            toneAnalysis: null,
            contentSuggestions: []
          })
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    }

    mockChatCompletion.mockResolvedValue(mockResponse)

    // First hook call
    const { result: result1, rerender: rerender1 } = renderHook(
      ({ text }) => useWritingAssistant(text, 'test-conversation'),
      { initialProps: { text: 'Test message' } }
    )

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false)
    })

    // Second hook call with same text
    const { result: result2 } = renderHook(() =>
      useWritingAssistant('Test message', 'test-conversation')
    )

    // Should use cached result immediately
    expect(result2.current.isLoading).toBe(false)
    expect(mockChatCompletion).toHaveBeenCalledTimes(1) // Only called once due to cache
  })

  it('includes conversation context in API call', async () => {
    const mockResponse = {
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [{
        index: 0,
        message: {
          role: 'assistant' as const,
          content: JSON.stringify({
            grammarSuggestions: [],
            toneAnalysis: null,
            contentSuggestions: []
          })
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    }

    mockChatCompletion.mockResolvedValue(mockResponse)

    const { result } = renderHook(() =>
      useWritingAssistant('Test message', 'conversation-123', {
        toneMode: 'formal',
        suggestionTypes: ['grammar', 'tone']
      })
    )

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Test message')
        }),
        expect.objectContaining({
          content: expect.stringContaining('formal')
        }),
        expect.objectContaining({
          content: expect.stringContaining('grammar, tone')
        })
      ]),
      'gpt-3.5-turbo',
      undefined,
      undefined,
      expect.any(Object)
    )
  })
})