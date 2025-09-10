'use client'

import React, { useState, useEffect } from 'react'

interface KeyboardShortcut {
  key: string
  description: string
  category: string
  action?: () => void
}

interface KeyboardShortcutsProps {
  shortcuts?: KeyboardShortcut[]
  isOpen?: boolean
  onClose?: () => void
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  shortcuts: customShortcuts,
  isOpen: controlledIsOpen,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const defaultShortcuts: KeyboardShortcut[] = [
    // Navigation
    { key: 'Ctrl+K', description: 'Focus search', category: 'Navigation' },
    { key: 'Ctrl+N', description: 'New conversation', category: 'Navigation' },
    { key: 'Ctrl+Shift+N', description: 'New chat window', category: 'Navigation' },
    { key: 'Ctrl+B', description: 'Toggle sidebar', category: 'Navigation' },

    // Chat
    { key: 'Enter', description: 'Send message', category: 'Chat' },
    { key: 'Shift+Enter', description: 'New line', category: 'Chat' },
    { key: 'Ctrl+Enter', description: 'Send message (alternative)', category: 'Chat' },
    { key: '↑/↓', description: 'Navigate message history', category: 'Chat' },

    // Editing
    { key: 'Ctrl+Z', description: 'Undo', category: 'Editing' },
    { key: 'Ctrl+Y', description: 'Redo', category: 'Editing' },
    { key: 'Ctrl+A', description: 'Select all', category: 'Editing' },
    { key: 'Ctrl+C', description: 'Copy', category: 'Editing' },
    { key: 'Ctrl+V', description: 'Paste', category: 'Editing' },
    { key: 'Ctrl+X', description: 'Cut', category: 'Editing' },

    // Model Selection
    { key: 'Ctrl+1-9', description: 'Switch to model 1-9', category: 'Models' },
    { key: 'Ctrl+Shift+M', description: 'Open model selector', category: 'Models' },

    // Settings
    { key: 'Ctrl+,', description: 'Open settings', category: 'Settings' },
    { key: 'Ctrl+Shift+P', description: 'Command palette', category: 'Settings' },

    // Accessibility
    { key: 'Tab', description: 'Navigate between elements', category: 'Accessibility' },
    { key: 'Shift+Tab', description: 'Navigate backwards', category: 'Accessibility' },
    { key: 'Enter/Space', description: 'Activate element', category: 'Accessibility' },
    { key: 'Escape', description: 'Close dialogs/menus', category: 'Accessibility' },

    // Help
    { key: 'F1', description: 'Show help', category: 'Help' },
    { key: 'Ctrl+/', description: 'Show keyboard shortcuts', category: 'Help' }
  ]

  const shortcuts = customShortcuts || defaultShortcuts

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen)
    }
  }, [controlledIsOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+/ or ? to show shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault()
        setIsOpen(true)
      }

      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close keyboard shortcuts"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-900 mb-3">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{shortcut.description}</span>
                      <kbd className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 border border-gray-300 rounded">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact keyboard shortcut hint
interface ShortcutHintProps {
  shortcut: string
  description: string
  className?: string
}

export const ShortcutHint: React.FC<ShortcutHintProps> = ({
  shortcut,
  description,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 text-xs text-gray-500 ${className}`}>
      <span>{description}</span>
      <kbd className="px-1.5 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded">
        {shortcut}
      </kbd>
    </div>
  )
}

export default KeyboardShortcuts