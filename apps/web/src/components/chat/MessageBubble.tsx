'use client'

import { useState, useRef, useEffect, useMemo, memo } from 'react'
import type { Database } from '../../types/database'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { CodeBlock } from './CodeBlock'
import { parseMessageContent } from '../../lib/messageParser'
import { useAnimationClasses } from '../../hooks/useReducedMotion'
import { CopyFeedback } from '../ui/Feedback'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'

type Message = Database['public']['Tables']['messages']['Row']

interface MessageBubbleProps {
  message: Message
  onEdit?: (messageId: string, newContent: string) => Promise<void>
  onDelete?: (messageId: string) => Promise<void>
}

interface MessageContentProps {
  content: string
}

function MessageContent({ content }: MessageContentProps) {
  const parsedContent = parseMessageContent(content)

  return (
    <>
      {parsedContent.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language}
            />
          )
        }
        return <span key={index}>{part.content}</span>
      })}
    </>
  )
}

const MessageBubbleComponent = ({ message, onEdit, onDelete }: MessageBubbleProps) => {
  const { user } = useAuth()
  const { confirm } = useConfirmDialog()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const animationClasses = useAnimationClasses()

  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  const messageLabelId = `message-label-${message.id}`
  const timestampId = `timestamp-${message.id}`

  const timeString = useMemo(() =>
    new Date(message.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
    [message.created_at]
  )

  const isEdited = useMemo(() =>
    message.updated_at && message.updated_at !== message.created_at,
    [message.updated_at, message.created_at]
  )

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length)
    }
  }, [isEditing])

  // Animate message appearance when it first renders
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleEdit = async () => {
    if (!onEdit || !user) return

    const trimmedContent = editContent.trim()
    if (!trimmedContent || trimmedContent === message.content) {
      setIsEditing(false)
      setEditContent(message.content)
      return
    }

    setIsLoading(true)
    try {
      await onEdit(message.id, trimmedContent)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to edit message:', error)
      // Error is handled by the hook's rollback
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !user) return

    const confirmed = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'destructive'
    })

    if (!confirmed) return

    setIsLoading(true)
    try {
      await onDelete(message.id)
    } catch (error) {
      console.error('Failed to delete message:', error)
      // Error is handled by the hook's rollback
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditContent(message.content)
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group ${
      isVisible ? animationClasses.messageAppear : 'opacity-0'
    }`}>
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg relative ${
          isUser
            ? 'bg-blue-600 text-white'
            : isSystem
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
        } rounded-lg px-4 py-3 shadow-sm ${animationClasses.messageHover}`}
        role="article"
        aria-labelledby={messageLabelId}
        aria-describedby={timestampId}
      >
        <div
          id={messageLabelId}
          className="sr-only"
        >
          {isUser ? 'You said' : isSystem ? 'System message' : 'AI responded'}
        </div>
        {/* Message Content */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none resize-none text-inherit placeholder-gray-400"
            rows={Math.min(Math.max(editContent.split('\n').length, 1), 10)}
            disabled={isLoading}
            aria-label="Edit message content"
          />
        ) : (
          <div className="whitespace-pre-wrap break-words" aria-live={isUser ? undefined : 'polite'}>
            {/* Display image if present */}
            {message.metadata && typeof message.metadata === 'object' && 'image' in message.metadata && (
              <div className="mb-2">
                <img
                  src={(message.metadata as any).image.url}
                  alt={(message.metadata as any).image.filename || 'Uploaded image'}
                  className="max-w-full max-h-64 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  loading="lazy"
                />
              </div>
            )}
            {/* Display message content */}
            <MessageContent content={message.content} />
          </div>
        )}

        {/* Message Metadata */}
        <div className={`text-xs mt-2 ${
          isUser
            ? 'text-blue-200'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          <time id={timestampId} dateTime={message.created_at}>
            {timeString}
            {isEdited && (
              <span className="ml-2">(edited)</span>
            )}
          </time>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={handleEdit}
              disabled={isLoading}
              className={`text-xs text-blue-200 hover:text-blue-100 underline disabled:opacity-50 ${
                animationClasses.buttonHover
              }`}
              aria-label="Save edited message"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setEditContent(message.content)
              }}
              disabled={isLoading}
              className={`text-xs text-blue-200 hover:text-blue-100 underline disabled:opacity-50 ${
                animationClasses.buttonHover
              }`}
              aria-label="Cancel editing message"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Message Actions */}
        {!isEditing && (
          <div className="flex items-center space-x-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyFeedback
              text={message.content}
              successMessage="Message copied!"
              className="text-xs text-blue-200 hover:text-blue-100 underline"
            >
              Copy
            </CopyFeedback>
            {isUser && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className={`text-xs text-blue-200 hover:text-blue-100 underline ${
                    animationClasses.buttonHover
                  }`}
                  disabled={isLoading}
                  aria-label="Edit this message"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className={`text-xs text-blue-200 hover:text-blue-100 underline ${
                    animationClasses.buttonHover
                  }`}
                  disabled={isLoading}
                  aria-label="Delete this message"
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export const MessageBubble = memo(MessageBubbleComponent)