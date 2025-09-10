'use client'

import { useState, useEffect } from 'react'
import { ApiKeySettings } from './ApiKeySettings'
import { WritingAssistantSettings } from './WritingAssistantSettings'
import { useAnimationClasses } from '../../hooks/useReducedMotion'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'api' | 'general'>('general') // Changed default to 'general'
  const [isVisible, setIsVisible] = useState(false)
  const animationClasses = useAnimationClasses()

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
        isVisible ? 'animate-fade-in' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden ${
        isVisible ? animationClasses.modalEnter : 'opacity-0 scale-95'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="settings-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
              animationClasses.buttonHover
            } ${animationClasses.focusRing}`}
            aria-label="Close settings modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'api'}
            aria-controls="api-tabpanel"
            id="api-tab"
            onClick={() => setActiveTab('api')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setActiveTab('api')
              }
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'api'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            } ${animationClasses.buttonHover} ${animationClasses.focusRing}`}
            tabIndex={activeTab === 'api' ? 0 : -1}
          >
            API Keys
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'general'}
            aria-controls="general-tabpanel"
            id="general-tab"
            onClick={() => setActiveTab('general')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setActiveTab('general')
              }
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            } ${animationClasses.buttonHover} ${animationClasses.focusRing}`}
            tabIndex={activeTab === 'general' ? 0 : -1}
          >
            General
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          <div
            id="api-tabpanel"
            role="tabpanel"
            aria-labelledby="api-tab"
            className={`${activeTab === 'api' ? animationClasses.slideInUp : 'hidden'}`}
            aria-hidden={activeTab !== 'api'}
          >
            {activeTab === 'api' && <ApiKeySettings />}
          </div>
          <div
            id="general-tabpanel"
            role="tabpanel"
            aria-labelledby="general-tab"
            className={`${activeTab === 'general' ? animationClasses.slideInUp : 'hidden'}`}
            aria-hidden={activeTab !== 'general'}
          >
            {activeTab === 'general' && (
              <div className="space-y-6">
                <WritingAssistantSettings />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
              animationClasses.buttonHover
            } ${animationClasses.buttonActive} ${animationClasses.focusRing}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}