import { useState, useEffect, useCallback, useMemo } from 'react'
import { openRouterAPI, OpenRouterMessage } from '../lib/openrouter'
import { useDebounce } from './useDebounce'

export interface ProactiveIntervention {
  id: string
  type: 'reminder' | 'suggestion' | 'warning' | 'help' | 'optimization'
  title: string
  message: string
  confidence: number
  pattern: string
  context: string
  actions: ProactiveAction[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dismissible: boolean
  autoTrigger: boolean
  cooldownMinutes: number
}

export interface ProactiveAction {
  id: string
  label: string
  type: 'apply' | 'show' | 'navigate' | 'execute'
  data?: any
}

export interface ProactiveAssistanceOptions {
  enabled: boolean
  maxInterventions: number
  minConfidence: number
  debounceMs: number
  interventionTypes: ProactiveIntervention['type'][]
  autoTriggerEnabled: boolean
  respectCooldowns: boolean
  useConversationHistory: boolean
}

const DEFAULT_OPTIONS: ProactiveAssistanceOptions = {
  enabled: true,
  maxInterventions: 2,
  minConfidence: 0.6,
  debounceMs: 2000,
  interventionTypes: ['reminder', 'suggestion', 'warning', 'help', 'optimization'],
  autoTriggerEnabled: true,
  respectCooldowns: true,
  useConversationHistory: true
}

// Cache for interventions
interface CachedIntervention {
  interventions: ProactiveIntervention[]
  __timestamp: number
}
const interventionCache = new Map<string, CachedIntervention>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

// Track dismissed interventions to prevent re-showing
const dismissedInterventions = new Set<string>()
const interventionCooldowns = new Map<string, number>()

export const useProactiveAssistance = (
  conversationId: string | null,
  currentMessage: string,
  conversationHistory: Array<{ role: string; content: string; timestamp?: string }> = [],
  userContext: {
    preferences?: string[]
    recentActions?: string[]
    commonPatterns?: string[]
  } = {},
  options: Partial<ProactiveAssistanceOptions> = {}
) => {
  const finalOptions = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])

  const [interventions, setInterventions] = useState<ProactiveIntervention[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce the current message
  const debouncedMessage = useDebounce(currentMessage, finalOptions.debounceMs)

  // Memoize conversation history and context processing to prevent unnecessary recalculations
  const memoizedHistory = useMemo(() => {
    return conversationHistory.slice(-8).map(m => m.content).join('').slice(0, 400)
  }, [conversationHistory])

  const memoizedContext = useMemo(() => {
    return JSON.stringify(userContext).slice(0, 200)
  }, [userContext])

  const cacheKey = useMemo(() => {
    return `${conversationId || 'new'}-${debouncedMessage.slice(0, 200)}-${memoizedHistory}-${memoizedContext}`
  }, [conversationId, debouncedMessage, memoizedHistory, memoizedContext])

  // Memoize context messages to prevent unnecessary recalculations
  const contextMessages = useMemo(() => {
    return finalOptions.useConversationHistory
      ? conversationHistory.slice(-15).map(m => `${m.role}: ${m.content}`).join('\n').slice(0, 2000)
      : ''
  }, [conversationHistory, finalOptions.useConversationHistory])

  const userContextStr = useMemo(() => {
    return Object.entries(userContext)
      .filter(([_, value]) => value && Array.isArray(value) && value.length > 0)
      .map(([key, value]) => `${key}: ${value.join(', ')}`)
      .join('\n')
  }, [userContext])

  // Check cache first
  const cachedResult = useMemo(() => {
    if (!finalOptions.enabled || !debouncedMessage.trim()) return null

    const cached = interventionCache.get(cacheKey)
    if (cached && Date.now() - cached.__timestamp < CACHE_TTL) {
      return cached.interventions
    }
    return null
  }, [cacheKey, finalOptions.enabled, debouncedMessage])

  const generateInterventions = useCallback(async (message: string) => {
    if (!finalOptions.enabled || !message.trim()) {
      setInterventions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {

      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `You are a proactive assistance AI. Analyze conversations and user patterns to provide timely, helpful interventions.

Return a JSON array of intervention objects with this structure:
[
  {
    "id": "unique-id",
    "type": "reminder|suggestion|warning|help|optimization",
    "title": "brief intervention title",
    "message": "detailed intervention message",
    "confidence": 0.0-1.0,
    "pattern": "detected pattern that triggered this",
    "context": "why this intervention is relevant",
    "actions": [
      {
        "id": "action-id",
        "label": "action label",
        "type": "apply|show|navigate|execute",
        "data": {}
      }
    ],
    "priority": "low|medium|high|urgent",
    "dismissible": true,
    "autoTrigger": false,
    "cooldownMinutes": 30
  }
]

Guidelines:
- Only intervene when genuinely helpful and timely
- Consider user context and conversation patterns
- Include intervention types: ${finalOptions.interventionTypes.join(', ')}
- Higher confidence for more certain interventions
- Higher priority for urgent or time-sensitive interventions
- Respect cooldown periods to avoid spam
- Make interventions actionable with clear next steps
- Limit to ${finalOptions.maxInterventions} interventions
- Only include interventions with confidence >= ${finalOptions.minConfidence}
- Generate unique IDs for each intervention`
        },
        {
          role: 'user',
          content: `Current message: "${message}"
${contextMessages ? `Conversation history:\n${contextMessages}` : ''}
${userContextStr ? `User context:\n${userContextStr}` : ''}

Generate proactive assistance interventions for this conversation.`
        }
      ]

      const response = await openRouterAPI.chatCompletion(
        messages,
        'gpt-4', // Use capable model for nuanced pattern detection
        undefined,
        undefined,
        {
          temperature: 0.2,
          maxTokens: 1200,
          systemPrompt: '',
          topP: 0.8,
          presencePenalty: 0.2,
          frequencyPenalty: 0.1
        }
      )

      const content = response.choices[0]?.message?.content
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content)

          if (Array.isArray(parsed)) {
            const now = Date.now()
            const validatedInterventions = parsed
              .filter((intervention: any) => {
                // Check if intervention type is allowed
                if (!finalOptions.interventionTypes.includes(intervention.type)) return false

                // Check confidence threshold
                if (intervention.confidence < finalOptions.minConfidence) return false

                // Check if intervention was recently dismissed
                if (finalOptions.respectCooldowns && dismissedInterventions.has(intervention.id)) {
                  const lastDismissed = interventionCooldowns.get(intervention.id) || 0
                  const cooldownMs = (intervention.cooldownMinutes || 30) * 60 * 1000
                  if (now - lastDismissed < cooldownMs) return false
                }

                return intervention.id && intervention.title && intervention.message
              })
              .slice(0, finalOptions.maxInterventions)
              .map((intervention: any, index: number) => ({
                id: intervention.id || `intervention-${Date.now()}-${index}`,
                type: intervention.type,
                title: intervention.title,
                message: intervention.message,
                confidence: Math.max(0, Math.min(1, intervention.confidence)),
                pattern: intervention.pattern || '',
                context: intervention.context || '',
                actions: Array.isArray(intervention.actions) ? intervention.actions : [],
                priority: intervention.priority || 'medium',
                dismissible: intervention.dismissible !== false,
                autoTrigger: intervention.autoTrigger || false,
                cooldownMinutes: intervention.cooldownMinutes || 30
              }))

            // Sort by priority and confidence
            validatedInterventions.sort((a, b) => {
              const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
              const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
              if (priorityDiff !== 0) return priorityDiff
              return b.confidence - a.confidence
            })

            // Cache the result
            interventionCache.set(cacheKey, {
              interventions: validatedInterventions,
              __timestamp: Date.now()
            })

            setInterventions(validatedInterventions)
          } else {
            throw new Error('Invalid response format')
          }
        } catch (parseError) {
          console.warn('Failed to parse proactive interventions:', parseError)
          setError('Failed to parse interventions')
          setInterventions([])
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Proactive assistance error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setInterventions([])
    } finally {
      setIsLoading(false)
    }
  }, [finalOptions, contextMessages, userContextStr, cacheKey])

  // Effect to trigger intervention generation
  useEffect(() => {
    if (cachedResult) {
      setInterventions(cachedResult)
      setIsLoading(false)
    } else {
      generateInterventions(debouncedMessage)
    }
  }, [debouncedMessage, generateInterventions, cachedResult])

  // Clear interventions when conversation changes significantly
  useEffect(() => {
    if (!currentMessage.trim()) {
      setInterventions([])
      setIsLoading(false)
      setError(null)
    }
  }, [currentMessage])

  const dismissIntervention = useCallback((interventionId: string) => {
    dismissedInterventions.add(interventionId)
    interventionCooldowns.set(interventionId, Date.now())
    setInterventions(prev => prev.filter(i => i.id !== interventionId))
  }, [])

  const executeInterventionAction = useCallback((interventionId: string, actionId: string) => {
    const intervention = interventions.find(i => i.id === interventionId)
    const action = intervention?.actions.find(a => a.id === actionId)

    if (intervention && action) {
      // Track the action execution
      console.log('Executing intervention action:', { interventionId, actionId, action })

      // Here you would implement the actual action execution logic
      // For now, just dismiss the intervention
      dismissIntervention(interventionId)
    }
  }, [interventions, dismissIntervention])

  return {
    interventions,
    isLoading,
    error,
    clearInterventions: () => setInterventions([]),
    refreshInterventions: () => generateInterventions(debouncedMessage),
    dismissIntervention,
    executeInterventionAction,
    getUrgentInterventions: () => interventions.filter(i => i.priority === 'urgent'),
    getAutoTriggerInterventions: () => interventions.filter(i => i.autoTrigger)
  }
}