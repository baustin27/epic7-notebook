'use client'

import { useState, useEffect, useMemo } from 'react'
import { Prompt, PromptCategory, DEFAULT_CATEGORIES } from '../../types/prompts'
import { DEFAULT_PROMPTS } from '../../lib/defaultPrompts'
import { PromptService } from '../../lib/promptService'
import { useToast } from '../../hooks/useToast'

interface PromptLibraryProps {
  isOpen: boolean
  onClose: () => void
  onSelectPrompt: (content: string) => void
}

export function PromptLibrary({ isOpen, onClose, onSelectPrompt }: PromptLibraryProps) {
   const { error: showErrorToast } = useToast()
   const [searchTerm, setSearchTerm] = useState('')
   const [selectedCategory, setSelectedCategory] = useState<string>('all')
   const [customPrompts, setCustomPrompts] = useState<Prompt[]>([])
   const [isCreating, setIsCreating] = useState(false)
   const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
   const [isLoading, setIsLoading] = useState(false)

   // Load custom prompts from database
   useEffect(() => {
     if (isOpen) {
       loadCustomPrompts()
     }
   }, [isOpen])

   const loadCustomPrompts = async () => {
     try {
       setIsLoading(true)
       const prompts = await PromptService.getUserPrompts()
       setCustomPrompts(prompts)
     } catch (error) {
       console.error('Failed to load custom prompts:', error)
       showErrorToast('Failed to load prompts', {
         title: 'Load Error',
         duration: 5000
       })
     } finally {
       setIsLoading(false)
     }
   }

  // Combine default and custom prompts
  const allPrompts = useMemo(() => {
    return [...DEFAULT_PROMPTS, ...customPrompts]
  }, [customPrompts])

  // Filter prompts based on search and category
  const filteredPrompts = useMemo(() => {
    return allPrompts.filter(prompt => {
      const matchesSearch = searchTerm === '' ||
        prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [allPrompts, searchTerm, selectedCategory])

  // Group prompts by category for display
  const groupedPrompts = useMemo(() => {
    const groups: Record<string, Prompt[]> = {}
    filteredPrompts.forEach(prompt => {
      if (!groups[prompt.category]) {
        groups[prompt.category] = []
      }
      groups[prompt.category].push(prompt)
    })
    return groups
  }, [filteredPrompts])

  const handleSelectPrompt = (prompt: Prompt) => {
    onSelectPrompt(prompt.content)
    onClose()
  }

  const handleCreatePrompt = () => {
    setIsCreating(true)
  }

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt)
  }

  const handleDeletePrompt = async (promptId: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      try {
        await PromptService.deletePrompt(promptId)
        setCustomPrompts(customPrompts.filter(p => p.id !== promptId))
      } catch (error) {
        console.error('Failed to delete prompt:', error)
        showErrorToast('Failed to delete prompt', {
          title: 'Delete Error',
          duration: 5000
        })
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Prompt Library
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close prompt library"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Sidebar - Categories */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                📚 All Prompts
              </button>

              {DEFAULT_CATEGORIES.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Create Custom Prompt Button */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCreatePrompt}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Custom
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {Object.entries(groupedPrompts).map(([categoryId, prompts]) => {
              const category = DEFAULT_CATEGORIES.find(c => c.id === categoryId)
              return (
                <div key={categoryId} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <span className="mr-2">{category?.icon}</span>
                    {category?.name || 'Custom'}
                  </h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    {prompts.map(prompt => (
                      <div
                        key={prompt.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {prompt.title}
                          </h4>
                          {prompt.isCustom && (
                            <div className="flex space-x-1 ml-2">
                              <button
                                onClick={() => handleEditPrompt(prompt)}
                                className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                                title="Edit prompt"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeletePrompt(prompt.id)}
                                className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                                title="Delete prompt"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        {prompt.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {prompt.description}
                          </p>
                        )}

                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                          {prompt.content.length > 100
                            ? `${prompt.content.substring(0, 100)}...`
                            : prompt.content
                          }
                        </div>

                        {prompt.tags && prompt.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {prompt.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => handleSelectPrompt(prompt)}
                          className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Use This Prompt
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {filteredPrompts.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No prompts found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search or create a custom prompt.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Prompt Modal */}
      {(isCreating || editingPrompt) && (
        <PromptEditor
           prompt={editingPrompt}
           onSave={async (prompt) => {
             try {
               if (editingPrompt) {
                 // Update existing
                 const updatedPrompt = await PromptService.updatePrompt(prompt.id!, prompt)
                 setCustomPrompts(customPrompts.map(p =>
                   p.id === prompt.id ? updatedPrompt : p
                 ))
                 setEditingPrompt(null)
               } else {
                 // Create new
                 const newPrompt = await PromptService.createPrompt({
                   title: prompt.title,
                   content: prompt.content,
                   category: prompt.category,
                   description: prompt.description,
                   tags: prompt.tags,
                   isCustom: true
                 })
                 setCustomPrompts([...customPrompts, newPrompt])
                 setIsCreating(false)
               }
             } catch (error) {
               console.error('Failed to save prompt:', error)
               showErrorToast('Failed to save prompt', {
                 title: 'Save Error',
                 duration: 5000
               })
             }
           }}
           onCancel={() => {
             setIsCreating(false)
             setEditingPrompt(null)
           }}
         />
      )}
    </div>
  )
}

// Prompt Editor Component
interface PromptEditorProps {
  prompt: Prompt | null
  onSave: (prompt: Prompt) => void
  onCancel: () => void
}

function PromptEditor({ prompt, onSave, onCancel }: PromptEditorProps) {
  const [title, setTitle] = useState(prompt?.title || '')
  const [content, setContent] = useState(prompt?.content || '')
  const [category, setCategory] = useState(prompt?.category || 'custom')
  const [description, setDescription] = useState(prompt?.description || '')
  const [tags, setTags] = useState(prompt?.tags?.join(', ') || '')

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return

    const promptData: Prompt = {
      id: prompt?.id || '',
      title: title.trim(),
      content: content.trim(),
      category,
      description: description.trim() || undefined,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      isCustom: true,
      updatedAt: new Date().toISOString()
    }

    onSave(promptData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {prompt ? 'Edit Prompt' : 'Create Custom Prompt'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                placeholder="Enter prompt title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
              >
                {DEFAULT_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                placeholder="Brief description of the prompt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (optional)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                placeholder="Comma-separated tags"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prompt Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 resize-vertical"
                placeholder="Enter your prompt content here..."
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleSave}
              disabled={!title.trim() || !content.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {prompt ? 'Update Prompt' : 'Create Prompt'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}