'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useMessages } from '../../hooks/useRealtime'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { MessageBubble } from './MessageBubble'
import { EmptyState } from '../ui/EmptyState'
import { MessageSkeleton } from '../ui/Skeleton'
import { ErrorBoundary } from '../ui/ErrorBoundary'

import { FixedSizeList as List, ListChildComponentProps } from 'react-window'

interface ChatAreaProps {
  conversationId: string | null
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  return (
    <ErrorBoundary>
      <ChatAreaContent conversationId={conversationId} />
    </ErrorBoundary>
  )
}

function ChatAreaContent({ conversationId }: ChatAreaProps) {
  const { user } = useAuth()
  const { messages, loading, refresh, editMessage, deleteMessage } = useMessages(conversationId || '')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<any>(null)
  
  // Expose refresh function globally for MessageInput to call
  if (typeof window !== 'undefined') {
    (window as any).refreshMessages = refresh
  }

  // Auto-scroll to bottom when messages change - Container scrolling
  useEffect(() => {
    const scrollToBottom = () => {
      if (listRef.current && messages.length > 0) {
        listRef.current.scrollToItem(messages.length - 1, 'end')
      }
    }

    // Use multiple attempts to ensure scrolling works
    const timeoutId1 = setTimeout(scrollToBottom, 50)
    const timeoutId2 = setTimeout(scrollToBottom, 200)
    const timeoutId3 = setTimeout(scrollToBottom, 500)

    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      clearTimeout(timeoutId3)
    }
  }, [messages])

  // Also scroll to bottom when loading completes
  useEffect(() => {
    if (!loading) {
      const scrollToBottom = () => {
        if (listRef.current && messages.length > 0) {
          listRef.current.scrollToItem(messages.length - 1, 'end')
        }
      }

      const timeoutId = setTimeout(scrollToBottom, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [loading])

  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => (
      <div style={style} className="py-4">
        <MessageBubble
          message={messages[index]}
          onEdit={user ? (id: string, content: string) => editMessage(id, content, user.id) : undefined}
          onDelete={user ? (id: string) => deleteMessage(id, user.id) : undefined}
        />
      </div>
    ),
    [messages, editMessage, deleteMessage, user]
  )

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <EmptyState
          type="no-conversations"
          onAction={() => {
            // This would trigger creating a new conversation
            console.log('Create new conversation')
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 relative min-h-0">
      {/* Messages Container - Scrollable */}
      <div
        ref={messagesContainerRef}
        className="flex-1 p-4"
        data-messages-container
      >
        {loading ? (
          <div className="space-y-4">
            <MessageSkeleton />
            <MessageSkeleton />
            <MessageSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            type="no-messages"
            onAction={() => {
              // Focus on message input
              const messageInput = document.querySelector('[data-message-input]') as HTMLElement
              messageInput?.focus()
            }}
          />
        ) : (
          <List
            ref={listRef}
            height={600}
            itemCount={messages.length}
            itemSize={80}
            width="100%"
            overscanCount={5}
          >
            {Row}
          </List>
        )}
      </div>

      {/* Scroll to bottom button */}
      {messages.length > 5 && (
        <button
          onClick={() => {
            if (listRef.current && messages.length > 0) {
              listRef.current.scrollToItem(messages.length - 1, 'end')
            }
          }}
          className="absolute bottom-24 right-4 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors opacity-80 hover:opacity-100 z-20"
          aria-label="Scroll to bottom"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  )
}