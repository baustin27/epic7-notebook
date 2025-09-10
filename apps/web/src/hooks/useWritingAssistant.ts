import { useState, useEffect, useCallback, useMemo } from 'react'
import { openRouterAPI, OpenRouterMessage } from '../lib/openrouter'
import { useDebounce } from './useDebounce'

export interface GrammarSuggestion {
  type: 'grammar' | 'style' | 'clarity'
  original: string
  suggestion: string
  explanation: string
  position: {
    start: number
    end: number
  }
}

export interface ToneAnalysis {
  currentTone: 'formal' | 'casual' | 'professional' | 'friendly' | 'academic'
  confidence: number
  suggestions: string[]
}

export interface ContentSuggestion {
  type: 'completion' | 'expansion' | 'alternative'
  text: string
  relevance: number
  context: string
}

export interface WritingAssistantResult {
  grammarSuggestions: GrammarSuggestion[]
  toneAnalysis: ToneAnalysis | null
  contentSuggestions: ContentSuggestion[]
  isLoading: boolean
  error: string | null
}

export interface WritingAssistantOptions {
  enabled: boolean
  toneMode: 'auto' | 'formal' | 'casual' | 'professional' | 'friendly' | 'academic'
  suggestionTypes: ('grammar' | 'style' | 'tone' | 'content')[]
  debounceMs: number
}

const DEFAULT_OPTIONS: WritingAssistantOptions = {
  enabled: true,
  toneMode: 'auto',
  suggestionTypes: ['grammar', 'style', 'tone', 'content'],
  debounceMs: 300
}

// Simple in-memory cache for suggestions
interface CachedResult extends WritingAssistantResult {
  __timestamp: number
}
const suggestionCache = new Map<string, CachedResult>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const useWritingAssistant = (
  text: string,
  conversationId: string | null,
  options: Partial<WritingAssistantOptions> = {}
): WritingAssistantResult => {
  // Load settings from localStorage
  const [savedSettings, setSavedSettings] = useState({
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    enabled: true,
    toneMode: 'auto' as 'auto' | 'formal' | 'casual' | 'professional' | 'friendly' | 'academic',
    suggestionTypes: ['grammar', 'style', 'tone', 'content'] as ('grammar' | 'style' | 'tone' | 'content')[]
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('writingAssistantSettings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSavedSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.error('Failed to load writing assistant settings:', error)
    }
  }, [])

  const finalOptions = useMemo(() => ({ 
    ...DEFAULT_OPTIONS, 
    ...options,
    enabled: savedSettings.enabled && (options.enabled ?? DEFAULT_OPTIONS.enabled),
    toneMode: savedSettings.toneMode,
    suggestionTypes: savedSettings.suggestionTypes
  }), [options, savedSettings])

  const [result, setResult] = useState<WritingAssistantResult>({
    grammarSuggestions: [],
    toneAnalysis: null,
    contentSuggestions: [],
    isLoading: false,
    error: null
  })

  // Debounce the text input
  const debouncedText = useDebounce(text, finalOptions.debounceMs)

  // Create cache key
  const cacheKey = useMemo(() => {
    return `${conversationId || 'new'}-${debouncedText.slice(0, 100)}-${finalOptions.toneMode}`
  }, [conversationId, debouncedText, finalOptions.toneMode])

  // Check cache first
  const cachedResult = useMemo(() => {
    if (!finalOptions.enabled || debouncedText.length < 10) return null

    const cached = suggestionCache.get(cacheKey)
    if (cached && Date.now() - (cached as any).__timestamp < CACHE_TTL) {
      return cached
    }
    return null
  }, [cacheKey, finalOptions.enabled, debouncedText.length])

  const analyzeText = useCallback(async (textToAnalyze: string) => {
    if (!finalOptions.enabled || textToAnalyze.length < 10) {
      setResult({
        grammarSuggestions: [],
        toneAnalysis: null,
        contentSuggestions: [],
        isLoading: false,
        error: null
      })
      return
    }

    setResult(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `You are a writing assistant. Analyze the following text and provide suggestions in JSON format.

Return a JSON object with this structure:
{
  "grammarSuggestions": [
    {
      "type": "grammar|style|clarity",
      "original": "original text",
      "suggestion": "suggested replacement",
      "explanation": "why this suggestion",
      "position": {"start": number, "end": number}
    }
  ],
  "toneAnalysis": {
    "currentTone": "formal|casual|professional|friendly|academic",
    "confidence": 0.0-1.0,
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "contentSuggestions": [
    {
      "type": "completion|expansion|alternative",
      "text": "suggested text",
      "relevance": 0.0-1.0,
      "context": "why this suggestion fits"
    }
  ]
}

Keep suggestions concise and actionable. Focus on the most important improvements.`
        },
        {
          role: 'user',
          content: `Analyze this text for writing improvements: "${textToAnalyze}"

${finalOptions.suggestionTypes.includes('tone') ? `Target tone: ${finalOptions.toneMode}` : ''}
Provide suggestions for: ${finalOptions.suggestionTypes.join(', ')}`
        }
      ]

      const response = await openRouterAPI.chatCompletion(
        messages,
        savedSettings.model, // Use user's selected free model
        undefined, // No streaming needed
        undefined, // No abort signal
        {
          temperature: 0.3, // Lower temperature for consistent suggestions
          maxTokens: 1000,
          systemPrompt: '',
          topP: 1.0,
          presencePenalty: 0.0,
          frequencyPenalty: 0.0
        }
      )

      const content = response.choices[0]?.message?.content
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content)

          // Validate the response structure
          const validatedResult: WritingAssistantResult = {
            grammarSuggestions: Array.isArray(parsed.grammarSuggestions)
              ? parsed.grammarSuggestions.filter((s: any) =>
                  s.type && s.original && s.suggestion && typeof s.position?.start === 'number'
                )
              : [],
            toneAnalysis: parsed.toneAnalysis && typeof parsed.toneAnalysis === 'object'
              ? {
                  currentTone: parsed.toneAnalysis.currentTone || 'casual',
                  confidence: Math.max(0, Math.min(1, parsed.toneAnalysis.confidence || 0)),
                  suggestions: Array.isArray(parsed.toneAnalysis.suggestions)
                    ? parsed.toneAnalysis.suggestions.slice(0, 3)
                    : []
                }
              : null,
            contentSuggestions: Array.isArray(parsed.contentSuggestions)
              ? parsed.contentSuggestions
                  .filter((s: any) => s.type && s.text)
                  .slice(0, 5) // Limit to 5 suggestions
                  .map((s: any) => ({
                    type: s.type,
                    text: s.text,
                    relevance: Math.max(0, Math.min(1, s.relevance || 0.5)),
                    context: s.context || ''
                  }))
              : [],
            isLoading: false,
            error: null
          }

          setResult(validatedResult)
        } catch (parseError) {
          console.warn('Failed to parse writing assistant response:', parseError)
          setResult({
            grammarSuggestions: [],
            toneAnalysis: null,
            contentSuggestions: [],
            isLoading: false,
            error: 'Failed to parse suggestions'
          })
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Writing assistant error:', error)
      setResult({
        grammarSuggestions: [],
        toneAnalysis: null,
        contentSuggestions: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [finalOptions.enabled, finalOptions.suggestionTypes, finalOptions.toneMode]) // Removed cacheKey and finalOptions from deps

  // Effect to trigger analysis when debounced text changes
  useEffect(() => {
    if (cachedResult) {
      setResult(cachedResult)
    } else if (finalOptions.enabled && debouncedText.length >= 10) {
      // Cache the result with the current key
      const currentCacheKey = `${conversationId || 'new'}-${debouncedText.slice(0, 100)}-${finalOptions.toneMode}`
      analyzeText(debouncedText).then((result) => {
        if (result) {
          suggestionCache.set(currentCacheKey, { ...result, __timestamp: Date.now() } as any)
        }
      }).catch(() => {
        // Error already handled in analyzeText
      })
    }
  }, [debouncedText, cachedResult, finalOptions.enabled, finalOptions.toneMode, conversationId])

  return result
}