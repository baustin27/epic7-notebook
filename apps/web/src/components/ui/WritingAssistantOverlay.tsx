import React, { useState, useEffect } from 'react'
import { GrammarSuggestion, ToneAnalysis, ContentSuggestion } from '../../hooks/useWritingAssistant'

interface WritingAssistantOverlayProps {
  grammarSuggestions: GrammarSuggestion[]
  toneAnalysis: ToneAnalysis | null
  contentSuggestions: ContentSuggestion[]
  isLoading: boolean
  error: string | null
  onApplySuggestion: (suggestion: GrammarSuggestion | ContentSuggestion, type: 'grammar' | 'content') => void
  onDismissSuggestion: (index: number, type: 'grammar' | 'tone' | 'content') => void
  className?: string
}

export const WritingAssistantOverlay: React.FC<WritingAssistantOverlayProps> = ({
  grammarSuggestions,
  toneAnalysis,
  contentSuggestions,
  isLoading,
  error,
  onApplySuggestion,
  onDismissSuggestion,
  className = ''
}) => {
  const [visibleSuggestions, setVisibleSuggestions] = useState(true)
  const [expandedSections, setExpandedSections] = useState({
    grammar: true,
    tone: true,
    content: true
  })

  // Auto-hide after 10 seconds of no interaction
  useEffect(() => {
    if (grammarSuggestions.length > 0 || toneAnalysis || contentSuggestions.length > 0) {
      const timer = setTimeout(() => setVisibleSuggestions(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [grammarSuggestions, toneAnalysis, contentSuggestions])

  if (!visibleSuggestions && !isLoading) return null

  const hasSuggestions = grammarSuggestions.length > 0 || toneAnalysis || contentSuggestions.length > 0

  if (!hasSuggestions && !isLoading && !error) return null

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className={`fixed bottom-20 right-4 z-50 max-w-sm ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Writing Assistant
            </h3>
          </div>
          <button
            onClick={() => setVisibleSuggestions(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
            aria-label="Close writing assistant"
          >
            ×
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
            <span>Analyzing your text...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 mb-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Grammar Suggestions */}
        {grammarSuggestions.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => toggleSection('grammar')}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
            >
              <span className="flex items-center space-x-2">
                <span className="text-blue-500">📝</span>
                <span>Grammar & Style ({grammarSuggestions.length})</span>
              </span>
              <span className="text-gray-500">{expandedSections.grammar ? '−' : '+'}</span>
            </button>
            {expandedSections.grammar && (
              <div className="space-y-2">
                {grammarSuggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      <span className="font-medium">Suggestion:</span> {suggestion.suggestion}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {suggestion.explanation}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onApplySuggestion(suggestion, 'grammar')}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => onDismissSuggestion(index, 'grammar')}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tone Analysis */}
        {toneAnalysis && (
          <div className="mb-3">
            <button
              onClick={() => toggleSection('tone')}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
            >
              <span className="flex items-center space-x-2">
                <span className="text-green-500">🎭</span>
                <span>Tone Analysis</span>
              </span>
              <span className="text-gray-500">{expandedSections.tone ? '−' : '+'}</span>
            </button>
            {expandedSections.tone && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  <span className="font-medium">Current tone:</span> {toneAnalysis.currentTone}
                  <span className="text-xs text-gray-500 ml-2">
                    ({Math.round(toneAnalysis.confidence * 100)}% confidence)
                  </span>
                </p>
                {toneAnalysis.suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Suggestions:</p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {toneAnalysis.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => onDismissSuggestion(0, 'tone')}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content Suggestions */}
        {contentSuggestions.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => toggleSection('content')}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
            >
              <span className="flex items-center space-x-2">
                <span className="text-purple-500">💡</span>
                <span>Content Ideas ({contentSuggestions.length})</span>
              </span>
              <span className="text-gray-500">{expandedSections.content ? '−' : '+'}</span>
            </button>
            {expandedSections.content && (
              <div className="space-y-2">
                {contentSuggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      <span className="font-medium capitalize">{suggestion.type}:</span> {suggestion.text}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {suggestion.context}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onApplySuggestion(suggestion, 'content')}
                        className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => onDismissSuggestion(index, 'content')}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No suggestions */}
        {!hasSuggestions && !isLoading && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Start typing to get writing suggestions...
          </p>
        )}
      </div>
    </div>
  )
}