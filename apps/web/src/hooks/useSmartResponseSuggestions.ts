import { useState, useEffect, useCallback, useMemo } from 'react'
import { openRouterAPI, OpenRouterMessage } from '../lib/openrouter'
import { useDebounce } from './useDebounce'

export interface SmartResponseSuggestion {
  id: string
  text: string
  confidence: number
  category: 'agreement' | 'question' | 'clarification' | 'elaboration' | 'alternative' | 'conclusion'
  context: string
  tone: 'professional' | 'casual' | 'friendly' | 'formal'
  estimatedLength: number
}

export interface SmartResponseOptions {
  enabled: boolean
  maxSuggestions: number
  minConfidence: number
  debounceMs: number
  preferredTone: 'auto' | 'professional' | 'casual' | 'friendly' | 'formal'
  categories: SmartResponseSuggestion['category'][]
  useConversationHistory: boolean
}

const DEFAULT_OPTIONS: SmartResponseOptions = {
  enabled: true,
  maxSuggestions: 4,
  minConfidence: 0.4,
  debounceMs: 500,
  preferredTone: 'auto',
  categories: ['agreement', 'question', 'clarification', 'elaboration', 'alternative', 'conclusion'],
  useConversationHistory: true
}

// Cache for response suggestions
interface CachedResponse {
  suggestions: SmartResponseSuggestion[]
  __timestamp: number
}
const responseCache = new Map<string, CachedResponse>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

export const useSmartResponseSuggestions = (
  conversationId: string | null,
  lastMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  options: Partial<SmartResponseOptions> = {}
) => {
  const finalOptions = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])

  const [suggestions, setSuggestions] = useState<SmartResponseSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce the last message
  const debouncedLastMessage = useDebounce(lastMessage, finalOptions.debounceMs)

  // Memoize conversation history processing to prevent unnecessary recalculations
  const memoizedHistory = useMemo(() => {
    return conversationHistory.slice(-5).map(m => m.content).join('').slice(0, 200)
  }, [conversationHistory])

  const cacheKey = useMemo(() => {
    return `${conversationId || 'new'}-${debouncedLastMessage.slice(0, 100)}-${memoizedHistory}-${finalOptions.preferredTone}`
  }, [conversationId, debouncedLastMessage, memoizedHistory, finalOptions.preferredTone])

  // Memoize context messages to prevent unnecessary recalculations
  const contextMessages = useMemo(() => {
    return finalOptions.useConversationHistory
      ? conversationHistory.slice(-8).map(m => `${m.role}: ${m.content}`).join('\n').slice(0, 1000)
      : ''
  }, [conversationHistory, finalOptions.useConversationHistory])

  // Check cache first
  const cachedResult = useMemo(() => {
    if (!finalOptions.enabled || !debouncedLastMessage.trim()) return null

    const cached = responseCache.get(cacheKey)
    if (cached && Date.now() - cached.__timestamp < CACHE_TTL) {
      return cached.suggestions
    }
    return null
  }, [cacheKey, finalOptions.enabled, debouncedLastMessage])

  const generateSuggestions = useCallback(async (message: string) => {
    if (!finalOptions.enabled || !message.trim()) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {

      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `You are a smart response suggestion assistant. Analyze the conversation and provide relevant response options.

Return a JSON array of suggestion objects with this structure:
[
  {
    "id": "unique-id",
    "text": "suggested response text",
    "confidence": 0.0-1.0,
    "category": "agreement|question|clarification|elaboration|alternative|conclusion",
    "context": "why this suggestion fits the conversation",
    "tone": "professional|casual|friendly|formal",
    "estimatedLength": number
  }
]

Guidelines:
- Provide natural, conversational responses
- Consider the conversation flow and context
- Match the preferred tone: ${finalOptions.preferredTone}
- Include categories: ${finalOptions.categories.join(', ')}
- Keep responses concise but complete
- Higher confidence for more appropriate suggestions
- Limit to ${finalOptions.maxSuggestions} suggestions
- Only include suggestions with confidence >= ${finalOptions.minConfidence}
- Generate unique IDs for each suggestion`
        },
        {
          role: 'user',
          content: `Last message: "${message}"
${contextMessages ? `Conversation context:\n${contextMessages}` : ''}

Generate smart response suggestions for continuing this conversation.`
        }
      ]

      const response = await openRouterAPI.chatCompletion(
        messages,
        'gpt-3.5-turbo',
        undefined,
        undefined,
        {
          temperature: 0.4,
          maxTokens: 800,
          systemPrompt: '',
          topP: 0.9,
          presencePenalty: 0.2,
          frequencyPenalty: 0.1
        }
      )

      const content = response.choices[0]?.message?.content
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content)

          if (Array.isArray(parsed)) {
            const validatedSuggestions = parsed
              .filter((suggestion: any) =>
                suggestion.id &&
                suggestion.text &&
                typeof suggestion.confidence === 'number' &&
                finalOptions.categories.includes(suggestion.category) &&
                suggestion.confidence >= finalOptions.minConfidence
              )
              .slice(0, finalOptions.maxSuggestions)
              .map((suggestion: any, index: number) => ({
                id: suggestion.id || `suggestion-${Date.now()}-${index}`,
                text: suggestion.text,
                confidence: Math.max(0, Math.min(1, suggestion.confidence)),
                category: suggestion.category,
                context: suggestion.context || '',
                tone: suggestion.tone || 'casual',
                estimatedLength: suggestion.estimatedLength || suggestion.text.length
              }))

            // Cache the result
            responseCache.set(cacheKey, {
              suggestions: validatedSuggestions,
              __timestamp: Date.now()
            })

            setSuggestions(validatedSuggestions)
          } else {
            throw new Error('Invalid response format')
          }
        } catch (parseError) {
          console.warn('Failed to parse smart response suggestions:', parseError)
          setError('Failed to parse suggestions')
          setSuggestions([])
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Smart response suggestions error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [finalOptions, contextMessages, cacheKey])

  // Effect to trigger suggestion generation
  useEffect(() => {
    if (cachedResult) {
      setSuggestions(cachedResult)
      setIsLoading(false)
    } else {
      generateSuggestions(debouncedLastMessage)
    }
  }, [debouncedLastMessage, generateSuggestions, cachedResult])

  // Clear suggestions when conversation changes significantly
  useEffect(() => {
    if (!lastMessage.trim()) {
      setSuggestions([])
      setIsLoading(false)
      setError(null)
    }
  }, [lastMessage])

  return {
    suggestions,
    isLoading,
    error,
    clearSuggestions: () => setSuggestions([]),
    refreshSuggestions: () => generateSuggestions(debouncedLastMessage),
    dismissSuggestion: (suggestionId: string) => {
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    }
  }
}