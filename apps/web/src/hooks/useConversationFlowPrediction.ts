import { useState, useEffect, useCallback, useMemo } from 'react'
import { openRouterAPI, OpenRouterMessage } from '../lib/openrouter'
import { useDebounce } from './useDebounce'

export interface FlowPrediction {
  id: string
  type: 'action' | 'question' | 'clarification' | 'follow_up' | 'transition'
  title: string
  description: string
  confidence: number
  suggestedActions: string[]
  context: string
  priority: 'low' | 'medium' | 'high'
  estimatedTime: number // in minutes
}

export interface ConversationFlowOptions {
  enabled: boolean
  maxPredictions: number
  minConfidence: number
  debounceMs: number
  predictionTypes: FlowPrediction['type'][]
  useConversationHistory: boolean
  considerUserPatterns: boolean
}

const DEFAULT_OPTIONS: ConversationFlowOptions = {
  enabled: true,
  maxPredictions: 3,
  minConfidence: 0.5,
  debounceMs: 1000,
  predictionTypes: ['action', 'question', 'clarification', 'follow_up', 'transition'],
  useConversationHistory: true,
  considerUserPatterns: true
}

// Cache for flow predictions
interface CachedFlow {
  predictions: FlowPrediction[]
  __timestamp: number
}
const flowCache = new Map<string, CachedFlow>()
const CACHE_TTL = 20 * 60 * 1000 // 20 minutes

export const useConversationFlowPrediction = (
  conversationId: string | null,
  currentMessage: string,
  conversationHistory: Array<{ role: string; content: string; timestamp?: string }> = [],
  userPatterns: string[] = [],
  options: Partial<ConversationFlowOptions> = {}
) => {
  const finalOptions = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])

  const [predictions, setPredictions] = useState<FlowPrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce the current message
  const debouncedMessage = useDebounce(currentMessage, finalOptions.debounceMs)

  // Memoize conversation history and patterns processing to prevent unnecessary recalculations
  const memoizedHistory = useMemo(() => {
    return conversationHistory.slice(-10).map(m => m.content).join('').slice(0, 300)
  }, [conversationHistory])

  const memoizedPatterns = useMemo(() => {
    return userPatterns.slice(0, 5).join('').slice(0, 100)
  }, [userPatterns])

  const cacheKey = useMemo(() => {
    return `${conversationId || 'new'}-${debouncedMessage.slice(0, 150)}-${memoizedHistory}-${memoizedPatterns}`
  }, [conversationId, debouncedMessage, memoizedHistory, memoizedPatterns])

  // Memoize context messages to prevent unnecessary recalculations
  const contextMessages = useMemo(() => {
    return finalOptions.useConversationHistory
      ? conversationHistory.slice(-12).map(m => `${m.role}: ${m.content}`).join('\n').slice(0, 1500)
      : ''
  }, [conversationHistory, finalOptions.useConversationHistory])

  const patternsContext = useMemo(() => {
    return finalOptions.considerUserPatterns && userPatterns.length > 0
      ? `User patterns: ${userPatterns.slice(0, 10).join(', ')}`
      : ''
  }, [userPatterns, finalOptions.considerUserPatterns])

  // Check cache first
  const cachedResult = useMemo(() => {
    if (!finalOptions.enabled || !debouncedMessage.trim()) return null

    const cached = flowCache.get(cacheKey)
    if (cached && Date.now() - cached.__timestamp < CACHE_TTL) {
      return cached.predictions
    }
    return null
  }, [cacheKey, finalOptions.enabled, debouncedMessage])

  const generatePredictions = useCallback(async (message: string) => {
    if (!finalOptions.enabled || !message.trim()) {
      setPredictions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {

      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `You are a conversation flow prediction assistant. Analyze the conversation and predict what the user might need next.

Return a JSON array of prediction objects with this structure:
[
  {
    "id": "unique-id",
    "type": "action|question|clarification|follow_up|transition",
    "title": "brief prediction title",
    "description": "detailed explanation",
    "confidence": 0.0-1.0,
    "suggestedActions": ["action1", "action2"],
    "context": "why this prediction makes sense",
    "priority": "low|medium|high",
    "estimatedTime": number
  }
]

Guidelines:
- Predict natural next steps in the conversation
- Consider the conversation flow and context
- Include prediction types: ${finalOptions.predictionTypes.join(', ')}
- ${patternsContext}
- Higher confidence for more certain predictions
- Higher priority for time-sensitive or important predictions
- Include estimated time for suggested actions
- Limit to ${finalOptions.maxPredictions} predictions
- Only include predictions with confidence >= ${finalOptions.minConfidence}
- Generate unique IDs for each prediction`
        },
        {
          role: 'user',
          content: `Current message: "${message}"
${contextMessages ? `Conversation history:\n${contextMessages}` : ''}
${patternsContext}

Predict the next steps or needs in this conversation.`
        }
      ]

      const response = await openRouterAPI.chatCompletion(
        messages,
        'gpt-4', // Use more capable model for complex flow analysis
        undefined,
        undefined,
        {
          temperature: 0.3,
          maxTokens: 1000,
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
            const validatedPredictions = parsed
              .filter((prediction: any) =>
                prediction.id &&
                prediction.title &&
                prediction.description &&
                typeof prediction.confidence === 'number' &&
                finalOptions.predictionTypes.includes(prediction.type) &&
                prediction.confidence >= finalOptions.minConfidence
              )
              .slice(0, finalOptions.maxPredictions)
              .map((prediction: any, index: number) => ({
                id: prediction.id || `prediction-${Date.now()}-${index}`,
                type: prediction.type,
                title: prediction.title,
                description: prediction.description,
                confidence: Math.max(0, Math.min(1, prediction.confidence)),
                suggestedActions: Array.isArray(prediction.suggestedActions) ? prediction.suggestedActions : [],
                context: prediction.context || '',
                priority: prediction.priority || 'medium',
                estimatedTime: prediction.estimatedTime || 5
              }))

            // Sort by priority and confidence
            validatedPredictions.sort((a, b) => {
              const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
              const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
              if (priorityDiff !== 0) return priorityDiff
              return b.confidence - a.confidence
            })

            // Cache the result
            flowCache.set(cacheKey, {
              predictions: validatedPredictions,
              __timestamp: Date.now()
            })

            setPredictions(validatedPredictions)
          } else {
            throw new Error('Invalid response format')
          }
        } catch (parseError) {
          console.warn('Failed to parse flow predictions:', parseError)
          setError('Failed to parse predictions')
          setPredictions([])
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Conversation flow prediction error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setPredictions([])
    } finally {
      setIsLoading(false)
    }
  }, [finalOptions, contextMessages, patternsContext, cacheKey])

  // Effect to trigger prediction generation
  useEffect(() => {
    if (cachedResult) {
      setPredictions(cachedResult)
      setIsLoading(false)
    } else {
      generatePredictions(debouncedMessage)
    }
  }, [debouncedMessage, generatePredictions, cachedResult])

  // Clear predictions when conversation changes significantly
  useEffect(() => {
    if (!currentMessage.trim()) {
      setPredictions([])
      setIsLoading(false)
      setError(null)
    }
  }, [currentMessage])

  return {
    predictions,
    isLoading,
    error,
    clearPredictions: () => setPredictions([]),
    refreshPredictions: () => generatePredictions(debouncedMessage),
    dismissPrediction: (predictionId: string) => {
      setPredictions(prev => prev.filter(p => p.id !== predictionId))
    },
    getHighPriorityPredictions: () => predictions.filter(p => p.priority === 'high'),
    getActionablePredictions: () => predictions.filter(p => p.suggestedActions.length > 0)
  }
}