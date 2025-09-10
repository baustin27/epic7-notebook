'use client'

import { useState, useEffect } from 'react'
import { conversationService } from '../../lib/database'

interface ArchivedConversation {
  id: string
  title: string
  updated_at: string
  archived_at: string | null
  priority: string | null
  tags: string[] | null
  category: string | null
}

export function ArchivedConversations() {
  const [archivedConversations, setArchivedConversations] = useState<ArchivedConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null)
  const [bulkOperation, setBulkOperation] = useState<'unarchive' | 'delete' | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadArchivedConversations()
  }, [])

  const loadArchivedConversations = async () => {
    try {
      setLoading(true)
      const conversations = await conversationService.getArchived()
      setArchivedConversations(conversations)
    } catch (error) {
      console.error('Failed to load archived conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnarchive = async (conversationId: string) => {
    setUnarchivingId(conversationId)
    try {
      await conversationService.unarchive(conversationId)
      await loadArchivedConversations() // Refresh the list
    } catch (error) {
      console.error('Failed to unarchive conversation:', error)
      alert('Failed to unarchive conversation. Please try again.')
    } finally {
      setUnarchivingId(null)
    }
  }

  const handleBulkUnarchive = async () => {
    if (selectedIds.size === 0) return

    setBulkOperation('unarchive')
    try {
      const promises = Array.from(selectedIds).map(id => conversationService.unarchive(id))
      await Promise.all(promises)
      setSelectedIds(new Set())
      await loadArchivedConversations()
    } catch (error) {
      console.error('Failed to bulk unarchive conversations:', error)
      alert('Failed to unarchive some conversations. Please try again.')
    } finally {
      setBulkOperation(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.size} archived conversations? This action cannot be undone.`)) {
      return
    }

    setBulkOperation('delete')
    try {
      const promises = Array.from(selectedIds).map(id => conversationService.delete(id))
      await Promise.all(promises)
      setSelectedIds(new Set())
      await loadArchivedConversations()
    } catch (error) {
      console.error('Failed to bulk delete conversations:', error)
      alert('Failed to delete some conversations. Please try again.')
    } finally {
      setBulkOperation(null)
    }
  }

  const toggleSelection = (conversationId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId)
    } else {
      newSelected.add(conversationId)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === archivedConversations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(archivedConversations.map(c => c.id)))
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Loading archived conversations...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Archived Conversations ({archivedConversations.length})
        </h2>

        {selectedIds.size > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={handleBulkUnarchive}
              disabled={bulkOperation === 'unarchive'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {bulkOperation === 'unarchive' ? 'Unarchiving...' : `Unarchive (${selectedIds.size})`}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkOperation === 'delete'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
            >
              {bulkOperation === 'delete' ? 'Deleting...' : `Delete (${selectedIds.size})`}
            </button>
          </div>
        )}
      </div>

      {archivedConversations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No archived conversations</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Conversations that have been inactive for an extended period will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="checkbox"
              checked={selectedIds.size === archivedConversations.length}
              onChange={selectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Select all ({archivedConversations.length})
            </span>
          </div>

          {archivedConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(conversation.id)}
                onChange={() => toggleSelection(conversation.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                    {conversation.title}
                  </h3>
                  {conversation.priority && (
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      conversation.priority === 'urgent'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : conversation.priority === 'high'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                        : conversation.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    }`}>
                      {conversation.priority}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Last updated: {new Date(conversation.updated_at).toLocaleDateString()}</span>
                  <span>Archived: {conversation.archived_at ? new Date(conversation.archived_at).toLocaleDateString() : 'Unknown'}</span>
                  {conversation.category && <span>Category: {conversation.category}</span>}
                </div>

                {conversation.tags && conversation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conversation.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleUnarchive(conversation.id)}
                  disabled={unarchivingId === conversation.id}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {unarchivingId === conversation.id ? 'Unarchiving...' : 'Unarchive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}