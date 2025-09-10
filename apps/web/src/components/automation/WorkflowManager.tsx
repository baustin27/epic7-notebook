'use client'

import { useState, useEffect } from 'react'
import { AutomationWorkflow, TriggerType, AutomationAction } from '../../types/automation'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface WorkflowManagerProps {
  isOpen: boolean
  onClose: () => void
  workflows: AutomationWorkflow[]
  onCreateWorkflow: (workflow: Omit<AutomationWorkflow, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'user_id'>) => Promise<void>
  onUpdateWorkflow: (workflowId: string, updates: Partial<AutomationWorkflow>) => Promise<void>
  onDeleteWorkflow: (workflowId: string) => Promise<void>
  onExecuteWorkflow: (workflowId: string) => Promise<void>
}

export function WorkflowManager({
  isOpen,
  onClose,
  workflows,
  onCreateWorkflow,
  onUpdateWorkflow,
  onDeleteWorkflow,
  onExecuteWorkflow
}: WorkflowManagerProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list')
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null)

  // Form state for creating/editing workflows
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    trigger_type: 'manual' as TriggerType,
    trigger_conditions: [] as any[],
    actions: [] as AutomationAction[],
    is_active: true,
    priority: 0
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      trigger_type: 'manual',
      trigger_conditions: [],
      actions: [],
      is_active: true,
      priority: 0
    })
  }

  const handleCreateWorkflow = async () => {
    if (!formData.title.trim()) return

    setIsLoading(true)
    try {
      await onCreateWorkflow(formData)
      resetForm()
      setActiveTab('list')
    } catch (error) {
      console.error('Failed to create workflow:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateWorkflow = async () => {
    if (!selectedWorkflow || !formData.title.trim()) return

    setIsLoading(true)
    try {
      await onUpdateWorkflow(selectedWorkflow.id, formData)
      setSelectedWorkflow(null)
      setActiveTab('list')
    } catch (error) {
      console.error('Failed to update workflow:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditWorkflow = (workflow: AutomationWorkflow) => {
    setSelectedWorkflow(workflow)
    setFormData({
      title: workflow.title,
      description: workflow.description || '',
      trigger_type: workflow.trigger_type,
      trigger_conditions: workflow.trigger_conditions,
      actions: workflow.actions,
      is_active: workflow.is_active,
      priority: workflow.priority
    })
    setActiveTab('edit')
  }

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return

    setIsLoading(true)
    try {
      await onDeleteWorkflow(workflowToDelete)
      setWorkflowToDelete(null)
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Failed to delete workflow:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, {
        type: 'insert_text',
        data: { text: '' },
        confirmation_required: false
      }]
    }))
  }

  const updateAction = (index: number, updates: Partial<AutomationAction>) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === index ? { ...action, ...updates } : action
      )
    }))
  }

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }))
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                ⚙️ Workflow Manager
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close workflow manager"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mt-4">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'list'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                📋 My Workflows
              </button>
              <button
                onClick={() => {
                  resetForm()
                  setActiveTab('create')
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'create'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                ➕ Create New
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {activeTab === 'list' && (
              <div className="space-y-4">
                {workflows.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No workflows yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Create your first automation workflow to get started.
                    </p>
                    <button
                      onClick={() => {
                        resetForm()
                        setActiveTab('create')
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Your First Workflow
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {workflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {workflow.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {workflow.description || 'No description'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              workflow.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {workflow.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-gray-500">
                            Used {workflow.usage_count} times
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => onExecuteWorkflow(workflow.id)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              disabled={!workflow.is_active}
                            >
                              Execute
                            </button>
                            <button
                              onClick={() => handleEditWorkflow(workflow)}
                              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setWorkflowToDelete(workflow.id)
                                setShowDeleteConfirm(true)
                              }}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'create' || activeTab === 'edit') && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Workflow Title
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                        placeholder="Enter workflow title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                        placeholder="Describe what this workflow does"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Trigger Type
                      </label>
                      <select
                        value={formData.trigger_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, trigger_type: e.target.value as TriggerType }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                      >
                        <option value="manual">Manual (Execute on demand)</option>
                        <option value="pattern">Pattern (Detect repetitive behavior)</option>
                        <option value="keyword">Keyword (Trigger on specific words)</option>
                        <option value="context">Context (Based on conversation context)</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                      </label>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Priority
                        </label>
                        <input
                          type="number"
                          value={formData.priority}
                          onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                          className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Actions</h3>
                      <button
                        onClick={addAction}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Add Action
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {formData.actions.map((action, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <select
                              value={action.type}
                              onChange={(e) => updateAction(index, { type: e.target.value as any })}
                              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            >
                              <option value="suggest_response">Suggest Response</option>
                              <option value="apply_template">Apply Template</option>
                              <option value="insert_text">Insert Text</option>
                              <option value="show_suggestion">Show Suggestion</option>
                              <option value="execute_workflow">Execute Workflow</option>
                            </select>
                            <button
                              onClick={() => removeAction(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>

                          {action.type === 'insert_text' && (
                            <textarea
                              value={action.data.text || ''}
                              onChange={(e) => updateAction(index, {
                                data: { ...action.data, text: e.target.value }
                              })}
                              placeholder="Text to insert"
                              rows={2}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            />
                          )}

                          <label className="flex items-center mt-2">
                            <input
                              type="checkbox"
                              checked={action.confirmation_required}
                              onChange={(e) => updateAction(index, { confirmation_required: e.target.checked })}
                              className="mr-2"
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">Require confirmation</span>
                          </label>
                        </div>
                      ))}

                      {formData.actions.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No actions defined. Add an action to get started.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={activeTab === 'create' ? handleCreateWorkflow : handleUpdateWorkflow}
                    disabled={!formData.title.trim() || isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
                  >
                    {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
                    {activeTab === 'create' ? 'Create Workflow' : 'Update Workflow'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Workflow"
        message="Are you sure you want to delete this workflow? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteWorkflow}
        onCancel={() => {
          setWorkflowToDelete(null)
          setShowDeleteConfirm(false)
        }}
        type="destructive"
        isLoading={isLoading}
      />
    </>
  )
}