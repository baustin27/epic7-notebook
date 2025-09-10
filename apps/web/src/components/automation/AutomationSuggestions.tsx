'use client'

import { useState, useEffect } from 'react'
import { AutomationSuggestion, AutomationAction } from '../../types/automation'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface AutomationSuggestionsProps {
  suggestions: AutomationSuggestion[]
  onApplySuggestion: (suggestion: AutomationSuggestion, action: AutomationAction) => void
  onDismissSuggestion: (suggestionId: string) => void
  onCreateWorkflow: (suggestion: AutomationSuggestion) => void
  isVisible: boolean
  onClose: () => void
}

export function AutomationSuggestions({
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  onCreateWorkflow,
  isVisible,
  onClose
}: AutomationSuggestionsProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<AutomationSuggestion | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ suggestion: AutomationSuggestion; action: AutomationAction } | null>(null)

  const handleApplyAction = (suggestion: AutomationSuggestion, action: AutomationAction) => {
    if (action.confirmation_required) {
      setPendingAction({ suggestion, action })
      setShowConfirmDialog(true)
    } else {
      onApplySuggestion(suggestion, action)
    }
  }

  const handleConfirmAction = () => {
    if (pendingAction) {
      onApplySuggestion(pendingAction.suggestion, pendingAction.action)
      setPendingAction(null)
      setShowConfirmDialog(false)
    }
  }

  const handleCancelAction = () => {
    setPendingAction(null)
    setShowConfirmDialog(false)
  }

  if (!isVisible || suggestions.length === 0) return null

  return (
    <>
      <div className="fixed bottom-20 right-4 z-50 max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              🤖 Automation Suggestions
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {suggestion.title}
                  </h4>
                  <div className="flex items-center space-x-1 ml-2">
                    <span className="text-xs text-gray-500">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                    <button
                      onClick={() => onDismissSuggestion(suggestion.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Dismiss suggestion"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  {suggestion.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {suggestion.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleApplyAction(suggestion, action)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title={action.confirmation_required ? 'Requires confirmation' : 'Apply immediately'}
                    >
                      {action.type === 'suggest_response' && '💬 Suggest Response'}
                      {action.type === 'apply_template' && '📝 Apply Template'}
                      {action.type === 'insert_text' && '✏️ Insert Text'}
                      {action.type === 'show_suggestion' && '💡 Show Suggestion'}
                      {action.type === 'execute_workflow' && '⚡ Execute Workflow'}
                      {action.confirmation_required && ' ⚠️'}
                    </button>
                  ))}

                  <button
                    onClick={() => onCreateWorkflow(suggestion)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                    title="Create workflow from this suggestion"
                  >
                    ➕ Create Workflow
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 Suggestions are based on your conversation patterns and can be customized in settings.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirm Automation Action"
        message={
          pendingAction
            ? `Are you sure you want to ${pendingAction.action.type.replace('_', ' ')}? This action will be applied automatically.`
            : 'Are you sure you want to proceed with this automation action?'
        }
        confirmText="Apply Action"
        cancelText="Cancel"
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        type="warning"
      />
    </>
  )
}