import { renderHook, act, waitFor } from '@testing-library/react'
import { usePredictiveText } from '../usePredictiveText'
import { OpenRouterResponse } from '../../lib/openrouter'

// Mock the openRouterAPI
jest.mock('../../lib/openrouter', () => ({
  openRouterAPI: {
    chatCompletion: jest.fn()
  }
}))

import { openRouterAPI } from '../../lib/openrouter'

const mockChatCompletion = openRouterAPI.chatCompletion as jest.MockedFunction<typeof openRouterAPI.chatCompletion>

// Helper function to create mock OpenRouter responses
const createMockResponse = (content: string): OpenRouterResponse => ({
  id: 'test-id',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-3.5-turbo',
  choices: [{
    index: 0,
    message: {
      role: 'assistant' as const,
      content
    },
    finish_reason: 'stop' as const
  }],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150
  }
})

describe('usePredictiveText', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should not generate completions for short text', () => {
    const { result } = renderHook(() =>
      usePredictiveText('hi', 'test-conversation', [])
    )

    expect(result.current.completions).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should generate completions for longer text', async () => {
    const mockResponse = createMockResponse(JSON.stringify([
      {
        text: ' world',
        confidence: 0.9,
        type: 'word',
        context: 'Common greeting continuation'
      },
      {
        text: ' there',
        confidence: 0.7,
        type: 'word',
        context: 'Alternative greeting'
      }
    ]))

    mockChatCompletion.mockResolvedValue(mockResponse)

    const { result } = renderHook(() =>
      usePredictiveText('hello', 'test-conversation', [])
    )

    // Fast-forward timers to trigger debounced call
    act(() => {
      jest.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockChatCompletion).toHaveBeenCalledTimes(1)
    expect(result.current.completions).toHaveLength(2)
    expect(result.current.completions[0]).toEqual({
      text: ' world',
      confidence: 0.9,
      type: 'word',
      context: 'Common greeting continuation'
    })
  })

  it('should handle API errors gracefully', async () => {
    mockChatCompletion.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() =>
      usePredictiveText('hello world', 'test-conversation', [])
    )

    act(() => {
      jest.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('API Error')
    expect(result.current.completions).toEqual([])
  })

  it('should use cached results when available', async () => {
    const mockResponse = createMockResponse(JSON.stringify([
      {
        text: ' test',
        confidence: 0.8,
        type: 'word',
        context: 'Cached result'
      }
    ]))

    mockChatCompletion.mockResolvedValue(mockResponse)

    // First call to populate cache
    const { result: firstResult, rerender: firstRerender } = renderHook(
      ({ text }) => usePredictiveText(text, 'test-conversation', []),
      { initialProps: { text: 'hello' } }
    )

    act(() => {
      jest.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(firstResult.current.isLoading).toBe(false)
    })

    // Second call with same parameters should use cache
    const { result: secondResult } = renderHook(() =>
      usePredictiveText('hello', 'test-conversation', [])
    )

    expect(secondResult.current.completions).toHaveLength(1)
    expect(mockChatCompletion).toHaveBeenCalledTimes(1) // Should not call API again
  })

  it('should clear completions when text becomes too short', () => {
    const { result, rerender } = renderHook(
      ({ text }) => usePredictiveText(text, 'test-conversation', []),
      { initialProps: { text: 'hello world this is a long message' } }
    )

    expect(result.current.completions).toEqual([])

    rerender({ text: 'hi' })

    expect(result.current.completions).toEqual([])
  })

  it('should respect maxSuggestions limit', async () => {
    const mockResponse = createMockResponse(JSON.stringify([
      { text: ' one', confidence: 0.9, type: 'word', context: 'First' },
      { text: ' two', confidence: 0.8, type: 'word', context: 'Second' },
      { text: ' three', confidence: 0.7, type: 'word', context: 'Third' },
      { text: ' four', confidence: 0.6, type: 'word', context: 'Fourth' },
      { text: ' five', confidence: 0.5, type: 'word', context: 'Fifth' }
    ]))

    mockChatCompletion.mockResolvedValue(mockResponse)

    const { result } = renderHook(() =>
      usePredictiveText('hello', 'test-conversation', [], {
        maxSuggestions: 3
      })
    )

    act(() => {
      jest.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.completions).toHaveLength(3)
  })

  it('should filter by confidence threshold', async () => {
    const mockResponse = createMockResponse(JSON.stringify([
      { text: ' high', confidence: 0.8, type: 'word', context: 'High confidence' },
      { text: ' low', confidence: 0.2, type: 'word', context: 'Low confidence' }
    ]))

    mockChatCompletion.mockResolvedValue(mockResponse)

    const { result } = renderHook(() =>
      usePredictiveText('hello', 'test-conversation', [], {
        minConfidence: 0.5
      })
    )

    act(() => {
      jest.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.completions).toHaveLength(1)
    expect(result.current.completions[0].text).toBe(' high')
  })

  it('should clear completions manually', () => {
    const { result } = renderHook(() =>
      usePredictiveText('hello world', 'test-conversation', [])
    )

    act(() => {
      result.current.clearCompletions()
    })

    expect(result.current.completions).toEqual([])
  })

  it('should refresh completions on demand', async () => {
    const mockResponse = createMockResponse(JSON.stringify([
      { text: ' refreshed', confidence: 0.9, type: 'word', context: 'Refreshed result' }
    ]))

    mockChatCompletion.mockResolvedValue(mockResponse)

    const { result } = renderHook(() =>
      usePredictiveText('hello', 'test-conversation', [])
    )

    act(() => {
      result.current.refreshCompletions()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockChatCompletion).toHaveBeenCalled()
    expect(result.current.completions).toHaveLength(1)
  })
})