import { useState, useEffect, useCallback, useMemo } from 'react'
import { openRouterAPI, OpenRouterMessage } from '../lib/openrouter'
import { useDebounce } from './useDebounce'

export interface PredictiveCompletion {
  text: string
  confidence: number
  type: 'word' | 'phrase' | 'sentence'
  context: string
}

export interface PredictiveTextOptions {
  enabled: boolean
  maxSuggestions: number
  minConfidence: number
  debounceMs: number
  useConversationHistory: boolean
  completionTypes: ('word' | 'phrase' | 'sentence')[]
}

const DEFAULT_OPTIONS: PredictiveTextOptions = {
  enabled: true,
  maxSuggestions: 5,
  minConfidence: 0.3,
  debounceMs: 150,
  useConversationHistory: true,
  completionTypes: ['word', 'phrase', 'sentence']
}

// Simple in-memory cache for completions
interface CachedCompletion {
  completions: PredictiveCompletion[]
  __timestamp: number
}
const completionCache = new Map<string, CachedCompletion>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export const usePredictiveText = (
  text: string,
  conversationId: string | null,
  conversationHistory: string[] = [],
  options: Partial<PredictiveTextOptions> = {}
) => {
  const finalOptions = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])

  const [completions, setCompletions] = useState<PredictiveCompletion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce the text input for performance
  const debouncedText = useDebounce(text, finalOptions.debounceMs)

  // Create cache key - memoize conversation history to prevent unnecessary recalculations
  const memoizedHistory = useMemo(() => {
    return conversationHistory.slice(-5).join('').slice(0, 100)
  }, [conversationHistory])

  const cacheKey = useMemo(() => {
    return `${conversationId || 'new'}-${debouncedText.slice(0, 50)}-${memoizedHistory}-${finalOptions.completionTypes.join(',')}`
  }, [conversationId, debouncedText, memoizedHistory, finalOptions.completionTypes])

  // Memoize context messages to prevent unnecessary recalculations
  const contextMessages = useMemo(() => {
    return finalOptions.useConversationHistory
      ? conversationHistory.slice(-10).join('\n').slice(0, 500)
      : ''
  }, [conversationHistory, finalOptions.useConversationHistory])

  // Check cache first
  const cachedResult = useMemo(() => {
    if (!finalOptions.enabled || debouncedText.length < 3) return null

    const cached = completionCache.get(cacheKey)
    if (cached && Date.now() - cached.__timestamp < CACHE_TTL) {
      return cached.completions
    }
    return null
  }, [cacheKey, finalOptions.enabled, debouncedText.length])

  const generateCompletions = useCallback(async (inputText: string) => {
    if (!finalOptions.enabled || inputText.length < 3) {
      setCompletions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `You are a predictive text completion assistant. Analyze the current text and conversation context to provide relevant completions.

Return a JSON array of completion objects with this structure:
[
  {
    "text": "completion text",
    "confidence": 0.0-1.0,
    "type": "word|phrase|sentence",
    "context": "why this completion fits"
  }
]

Guidelines:
- Focus on completions that naturally continue the current text
- Consider the conversation context for relevance
- Provide completions for: ${finalOptions.completionTypes.join(', ')}
- Keep completions concise and natural
- Higher confidence for more certain completions
- Limit to ${finalOptions.maxSuggestions} suggestions
- Only include completions with confidence >= ${finalOptions.minConfidence}`
        },
        {
          role: 'user',
          content: `Current text: "${inputText}"
${contextMessages ? `Conversation context: ${contextMessages}` : ''}

Provide predictive completions for the current text.`
        }
      ]

      const response = await openRouterAPI.chatCompletion(
        messages,
        'gpt-3.5-turbo', // Fast model for real-time completions
        undefined,
        undefined,
        {
          temperature: 0.3,
          maxTokens: 500,
          systemPrompt: '',
          topP: 0.9,
          presencePenalty: 0.1,
          frequencyPenalty: 0.1
        }
      )

      const content = response.choices[0]?.message?.content
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content)

          if (Array.isArray(parsed)) {
            const validatedCompletions = parsed
              .filter((completion: any) =>
                completion.text &&
                typeof completion.confidence === 'number' &&
                finalOptions.completionTypes.includes(completion.type) &&
                completion.confidence >= finalOptions.minConfidence
              )
              .slice(0, finalOptions.maxSuggestions)
              .map((completion: any) => ({
                text: completion.text,
                confidence: Math.max(0, Math.min(1, completion.confidence)),
                type: completion.type,
                context: completion.context || ''
              }))

            // Cache the result
            completionCache.set(cacheKey, {
              completions: validatedCompletions,
              __timestamp: Date.now()
            })

            setCompletions(validatedCompletions)
          } else {
            throw new Error('Invalid response format')
          }
        } catch (parseError) {
          console.warn('Failed to parse predictive text response:', parseError)
          setError('Failed to parse completions')
          setCompletions([])
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Predictive text error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setCompletions([])
    } finally {
      setIsLoading(false)
    }
  }, [finalOptions, contextMessages, cacheKey])

  // Effect to trigger completion generation
  useEffect(() => {
    if (cachedResult) {
      setCompletions(cachedResult)
      setIsLoading(false)
    } else {
      generateCompletions(debouncedText)
    }
  }, [debouncedText, generateCompletions, cachedResult])

  // Clear completions when text becomes too short
  useEffect(() => {
    if (text.length < 3) {
      setCompletions([])
      setIsLoading(false)
      setError(null)
    }
  }, [text.length])

  return {
    completions,
    isLoading,
    error,
    clearCompletions: () => setCompletions([]),
    refreshCompletions: () => generateCompletions(debouncedText)
  }
}