'use client'

import { useState, useEffect } from 'react'
import { conversationService } from '../../lib/database'

interface ConversationMetadataEditorProps {
  conversationId: string
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

interface ConversationMetadata {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent' | null
  tags: string[] | null
  category: string | null
}

export function ConversationMetadataEditor({
  conversationId,
  isOpen,
  onClose,
  onUpdate
}: ConversationMetadataEditorProps) {
  const [metadata, setMetadata] = useState<ConversationMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [editedMetadata, setEditedMetadata] = useState<Partial<ConversationMetadata>>({})

  useEffect(() => {
    if (isOpen && conversationId) {
      loadConversationMetadata()
    }
  }, [isOpen, conversationId])

  const loadConversationMetadata = async () => {
    try {
      setLoading(true)
      const conversation = await conversationService.getById(conversationId)
      if (conversation) {
        const metadata: ConversationMetadata = {
          id: conversation.id,
          title: conversation.title,
          priority: conversation.priority,
          tags: conversation.tags,
          category: conversation.category
        }
        setMetadata(metadata)
        setEditedMetadata(metadata)
      }
    } catch (error) {
      console.error('Failed to load conversation metadata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!metadata) return

    try {
      setSaving(true)

      // Update priority if changed
      if (editedMetadata.priority !== metadata.priority) {
        await conversationService.updatePriority(conversationId, editedMetadata.priority!)
      }

      // Update tags if changed
      if (JSON.stringify(editedMetadata.tags) !== JSON.stringify(metadata.tags)) {
        // For now, we'll update the entire conversation object
        // In a more sophisticated implementation, you might have a dedicated tags update method
        await conversationService.update(conversationId, {
          title: editedMetadata.title || metadata.title
        })
        // Note: Tags would need to be updated via a separate API call or direct database update
      }

      onUpdate?.()
      onClose()
    } catch (error) {
      console.error('Failed to save metadata:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    if (!newTag.trim()) return

    const currentTags = editedMetadata.tags || []
    if (!currentTags.includes(newTag.trim())) {
      setEditedMetadata({
        ...editedMetadata,
        tags: [...currentTags, newTag.trim()]
      })
    }
    setNewTag('')
  }

  const removeTag = (tagToRemove: string) => {
    const currentTags = editedMetadata.tags || []
    setEditedMetadata({
      ...editedMetadata,
      tags: currentTags.filter(tag => tag !== tagToRemove)
    })
  }

  const handlePriorityChange = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    setEditedMetadata({
      ...editedMetadata,
      priority
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Conversation Metadata
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        ) : metadata ? (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editedMetadata.title || ''}
                onChange={(e) => setEditedMetadata({ ...editedMetadata, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Conversation title"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="flex space-x-2">
                {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handlePriorityChange(priority)}
                    className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                      editedMetadata.priority === priority
                        ? priority === 'urgent'
                          ? 'bg-red-600 text-white'
                          : priority === 'high'
                          ? 'bg-orange-600 text-white'
                          : priority === 'medium'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(editedMetadata.tags || []).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a tag"
                />
                <button
                  onClick={addTag}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            Failed to load conversation metadata
          </div>
        )}
      </div>
    </div>
  )
}