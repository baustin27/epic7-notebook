'use client'

import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useConversations } from '../../hooks/useRealtime'
import { conversationService, semanticSearchService, SearchResult } from '../../lib/database'
import { useAnimationClasses } from '../../hooks/useReducedMotion'
import { ConversationMetadataEditor } from './ConversationMetadataEditor'

// Lazy load ExportModal for better performance (includes heavy jsPDF dependency)
const ExportModal = lazy(() => import('./ExportModal').then(module => ({ default: module.ExportModal })))

interface SidebarProps {
  isOpen: boolean
  selectedConversationId: string | null
  onSelectConversation: (id: string | null) => void
  onNewConversation: () => void
  isCreating?: boolean
}

export function Sidebar({ isOpen, selectedConversationId, onSelectConversation, onNewConversation, isCreating }: SidebarProps) {
  const { conversations, loading } = useConversations()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [useSemanticSearch, setUseSemanticSearch] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [showArchived, setShowArchived] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all')
  const [metadataEditorOpen, setMetadataEditorOpen] = useState(false)
  const [metadataEditorConversationId, setMetadataEditorConversationId] = useState<string | null>(null)
  const animationClasses = useAnimationClasses()

  // Use semantic search results if available, otherwise fall back to filtered conversations
  const displayConversations = searchTerm && searchResults.length > 0
    ? searchResults.map(result => ({
        ...conversations.find(c => c.id === result.id),
        similarity: result.similarity,
        category: result.category,
        tags: result.tags,
        priority: result.priority,
        archived: result.archived
      })).filter(Boolean)
    : conversations.filter(conversation =>
        conversation.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (showArchived || !conversation.archived) &&
        (priorityFilter === 'all' || conversation.priority === priorityFilter)
      )

  const handleStartEdit = (conversation: any) => {
    setEditingId(conversation.id)
    setEditingTitle(conversation.title)
  }

  const handleSaveEdit = async () => {
    if (editingId && editingTitle.trim()) {
      try {
        await conversationService.update(editingId, { title: editingTitle.trim() })
        setEditingId(null)
        setEditingTitle('')
      } catch (error) {
        console.error('Failed to update conversation title:', error)
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const handleDeleteConversation = async (conversationId: string) => {
    setIsDeleting(true)
    try {
      await conversationService.delete(conversationId)

      // If the deleted conversation was selected, navigate away
      if (selectedConversationId === conversationId) {
        onSelectConversation(null)
      }

      setDeletingId(null)
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      alert('Failed to delete conversation. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // Keyboard navigation for conversation list
  const handleOpenMetadataEditor = (conversationId: string) => {
    setMetadataEditorConversationId(conversationId)
    setMetadataEditorOpen(true)
  }

  const handleCloseMetadataEditor = () => {
    setMetadataEditorOpen(false)
    setMetadataEditorConversationId(null)
  }

  const handleMetadataUpdate = () => {
    // Refresh conversations list
    // This will trigger a re-render with updated data
  }

  const handleListKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle keyboard navigation when sidebar is open and not editing
    if (!isOpen || editingId || deletingId || displayConversations.length === 0) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev =>
          prev < displayConversations.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < displayConversations.length) {
          onSelectConversation(displayConversations[focusedIndex]?.id || null)
        }
        break
      case 'Escape':
        e.preventDefault()
        setFocusedIndex(-1)
        break
    }
  }, [isOpen, editingId, deletingId, displayConversations, focusedIndex, onSelectConversation])

  // Set up keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleListKeyDown)
      return () => document.removeEventListener('keydown', handleListKeyDown)
    }
  }, [isOpen, handleListKeyDown])

  // Reset focus when conversations change or search changes
  useEffect(() => {
    setFocusedIndex(-1)
  }, [displayConversations.length, searchTerm])

  // Perform semantic search when search term changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([])
        return
      }

      if (!useSemanticSearch) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const results = await semanticSearchService.searchConversations({
          query: searchTerm,
          limit: 20,
          threshold: 0.1
        })
        setSearchResults(results)
      } catch (error) {
        console.error('Search failed:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(performSearch, 300) // Debounce search
    return () => clearTimeout(debounceTimer)
  }, [searchTerm, useSemanticSearch])

  if (!isOpen) return null

  return (
    <div className={`w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full ${
      animationClasses.slideInRight
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewConversation}
          aria-label="Create new conversation"
          disabled={isCreating}
          className={`w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed ${
            animationClasses.buttonHover
          } ${animationClasses.buttonActive} ${animationClasses.focusRing}`}
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder={useSemanticSearch ? "Semantic search conversations..." : "Search conversations..."}
              aria-label="Search conversations"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-3 py-2 pl-9 pr-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                animationClasses.focusRing
              }`}
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Search mode toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Search mode:</span>
            <button
              onClick={() => setUseSemanticSearch(!useSemanticSearch)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                useSemanticSearch
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {useSemanticSearch ? 'Semantic' : 'Keyword'}
            </button>
          </div>

          {/* Priority filter */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Archived toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Show archived:</span>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                showArchived
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {showArchived ? 'Yes' : 'No'}
            </button>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading conversations...</p>
          </div>
        ) : displayConversations.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div 
            className="p-2" 
            role="listbox" 
            aria-label="Conversation list"
            tabIndex={0}
          >
            {displayConversations.map((conversation: any, index: number) => (
              <div
                key={conversation.id}
                className={`w-full p-3 rounded-lg mb-1 transition-colors group ${
                  selectedConversationId === conversation.id
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : focusedIndex === index
                    ? 'bg-yellow-100 dark:bg-yellow-900 ring-2 ring-yellow-300 dark:ring-yellow-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                } ${animationClasses.cardHover}`}
                role="option"
                aria-selected={selectedConversationId === conversation.id}
                aria-current={focusedIndex === index ? 'true' : undefined}
              >
                <div className="flex items-start justify-between">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => editingId !== conversation.id && onSelectConversation(conversation.id)}
                  >
                    {editingId === conversation.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={handleSaveEdit}
                          className="w-full px-2 py-1 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Edit conversation title "${conversation.title}"`}
                          autoFocus
                        />
                        <div className="flex space-x-1">
                          <button
                            onClick={handleSaveEdit}
                            className={`px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 ${
                              animationClasses.buttonHover
                            } ${animationClasses.buttonActive}`}
                            aria-label="Save conversation title"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className={`px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 ${
                              animationClasses.buttonHover
                            } ${animationClasses.buttonActive}`}
                            aria-label="Cancel editing conversation title"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium truncate ${
                            selectedConversationId === conversation.id
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {conversation.title}
                          </p>
                          {conversation.similarity && (
                            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded ml-2">
                              {(conversation.similarity * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(conversation.updated_at).toLocaleDateString()}
                            </p>
                            {conversation.priority && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
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
                          {conversation.category && (
                            <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-1.5 py-0.5 rounded">
                              {conversation.category}
                            </span>
                          )}
                        </div>

                        {/* Tags display */}
                        {conversation.tags && conversation.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {conversation.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                              <span
                                key={tagIndex}
                                className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {conversation.tags.length > 3 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{conversation.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    {editingId !== conversation.id && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartEdit(conversation)
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity ${
                            animationClasses.buttonHover
                          }`}
                          title="Rename conversation"
                          aria-label={`Rename conversation "${conversation.title}"`}
                        >
                          <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExportingId(conversation.id)
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900 transition-opacity ${
                            animationClasses.buttonHover
                          }`}
                          title="Export conversation"
                          aria-label={`Export conversation "${conversation.title}"`}
                        >
                          <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenMetadataEditor(conversation.id)
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-200 dark:hover:bg-green-900 transition-opacity ${
                            animationClasses.buttonHover
                          }`}
                          title="Edit metadata (tags & priority)"
                          aria-label={`Edit metadata for conversation "${conversation.title}"`}
                        >
                          <svg className="w-3 h-3 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingId(conversation.id)
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-200 dark:hover:bg-red-900 transition-opacity ${
                            animationClasses.buttonHover
                          }`}
                          title="Delete conversation"
                          aria-label={`Delete conversation "${conversation.title}"`}
                        >
                          <svg className="w-3 h-3 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              if (conversation.archived) {
                                await conversationService.unarchive(conversation.id)
                              } else {
                                await conversationService.archive(conversation.id)
                              }
                            } catch (error) {
                              console.error('Failed to archive/unarchive conversation:', error)
                            }
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-purple-200 dark:hover:bg-purple-900 transition-opacity ${
                            animationClasses.buttonHover
                          }`}
                          title={conversation.archived ? "Unarchive conversation" : "Archive conversation"}
                          aria-label={conversation.archived ? `Unarchive conversation "${conversation.title}"` : `Archive conversation "${conversation.title}"`}
                        >
                          <svg className="w-3 h-3 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      </>
                    )}
                    <div className={`w-2 h-2 rounded-full ${
                      conversation.archived
                        ? 'bg-orange-500'
                        : conversation.is_active
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    }`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Export Modal */}
      <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>}>
        <ExportModal
          isOpen={exportingId !== null}
          conversationId={exportingId}
          conversationTitle={conversations.find(c => c.id === exportingId)?.title || ''}
          onClose={() => setExportingId(null)}
        />
      </Suspense>

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div
          className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
            animationClasses.modalEnter
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-confirm-title-${deletingId}`}
          aria-describedby={`delete-confirm-desc-${deletingId}`}
        >
          <div
            id={`delete-confirm-title-${deletingId}`}
            className="sr-only"
          >
            Delete Conversation
          </div>
          <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm mx-4 ${
            animationClasses.gentleBounce
          }`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Conversation
            </h3>
            <p
              id={`delete-confirm-desc-${deletingId}`}
              className="text-sm text-gray-600 dark:text-gray-400 mb-6"
            >
              Are you sure you want to delete this conversation? This action cannot be undone and will also delete all messages in this conversation.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDeleteConversation(deletingId)}
                disabled={isDeleting}
                className={`flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors ${
                  animationClasses.buttonHover
                } ${animationClasses.buttonActive}`}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
                <span className="sr-only">conversation</span>
              </button>
              <button
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className={`flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  animationClasses.buttonHover
                } ${animationClasses.buttonActive}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Editor */}
      <ConversationMetadataEditor
        conversationId={metadataEditorConversationId || ''}
        isOpen={metadataEditorOpen}
        onClose={handleCloseMetadataEditor}
        onUpdate={handleMetadataUpdate}
      />
    </div>
  )
}