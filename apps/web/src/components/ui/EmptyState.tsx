'use client'

import React from 'react'

interface EmptyStateProps {
  type?: 'new-user' | 'no-conversations' | 'search-results' | 'network-error' | 'no-messages' | 'custom'
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  illustration?: string | React.ReactNode
  className?: string
  compact?: boolean
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'new-user',
  title,
  description,
  actionLabel,
  onAction,
  illustration,
  className = '',
  compact = false
}) => {
  const getDefaultContent = () => {
    const defaults: Record<string, { title: string; description: string; actionLabel: string; illustration: string }> = {
      'new-user': {
        title: 'Welcome to AI Chat',
        description: 'Start your first conversation with an AI assistant. Ask questions, get help with tasks, or explore creative ideas.',
        actionLabel: 'Start Chatting',
        illustration: '🤖'
      },
      'no-conversations': {
        title: 'No conversations yet',
        description: 'Create your first conversation to get started with AI-powered assistance.',
        actionLabel: 'New Conversation',
        illustration: '💭'
      },
      'search-results': {
        title: 'No messages found',
        description: 'Try different keywords or check your spelling. You can also browse all conversations.',
        actionLabel: 'Clear Search',
        illustration: '🔍'
      },
      'network-error': {
        title: 'Connection lost',
        description: 'Check your internet connection and try again. Your work is automatically saved.',
        actionLabel: 'Retry',
        illustration: '📡'
      },
      'no-messages': {
        title: 'No messages in this conversation',
        description: 'Send your first message to start the conversation with the AI assistant.',
        actionLabel: 'Send Message',
        illustration: '💬'
      }
    }

    return defaults[type] || defaults['new-user']
  }

  const content = type === 'custom' ? {
    title: title || 'No content available',
    description: description || 'There\'s nothing to display here.',
    actionLabel: actionLabel || 'Get Started',
    illustration: illustration || '📄'
  } : getDefaultContent()

  const finalTitle = title || content.title
  const finalDescription = description || content.description
  const finalActionLabel = actionLabel || content.actionLabel
  const finalIllustration = illustration || content.illustration

  if (compact) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-3">{finalIllustration}</div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">{finalTitle}</h3>
        <p className="text-xs text-gray-500 mb-3">{finalDescription}</p>
        {onAction && (
          <button
            onClick={onAction}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors"
          >
            {finalActionLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="text-6xl mb-6">{finalIllustration}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{finalTitle}</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">{finalDescription}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          {finalActionLabel}
        </button>
      )}
    </div>
  )
}

// Search empty state with suggestions
interface SearchEmptyStateProps {
  query: string
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
  onClearSearch?: () => void
  className?: string
}

export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({
  query,
  suggestions = [],
  onSuggestionClick,
  onClearSearch,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-5xl mb-6">🔍</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No results for "{query}"
      </h3>
      <p className="text-gray-600 mb-6">
        Try adjusting your search terms or browse all conversations.
      </p>

      {suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Try searching for:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onClearSearch}
        className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Clear Search
      </button>
    </div>
  )
}

export default EmptyState