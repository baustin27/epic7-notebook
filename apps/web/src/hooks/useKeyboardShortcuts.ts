'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description?: string
  preventDefault?: boolean
  enabled?: boolean
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const shortcutsRef = useRef(shortcuts)

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const activeElement = document.activeElement
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.hasAttribute('contenteditable')
    )

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue

      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrlKey
      const shiftMatches = !!event.shiftKey === !!shortcut.shiftKey
      const altMatches = !!event.altKey === !!shortcut.altKey
      const metaMatches = !!event.metaKey === !!shortcut.metaKey

      // Skip shortcuts when typing in input fields (unless explicitly allowed)
      if (isInputFocused && !shortcut.key.includes('Escape') && !shortcut.key.includes('F')) {
        continue
      }

      if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
          event.stopPropagation()
        }

        shortcut.action()
        break // Only execute the first matching shortcut
      }
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    // Utility function to format shortcut for display
    formatShortcut: (shortcut: KeyboardShortcut): string => {
      const parts = []
      if (shortcut.ctrlKey || shortcut.metaKey) parts.push('Ctrl')
      if (shortcut.shiftKey) parts.push('Shift')
      if (shortcut.altKey) parts.push('Alt')
      parts.push(shortcut.key.toUpperCase())
      return parts.join('+')
    }
  }
}

// Predefined shortcuts for common actions
export const createCommonShortcuts = (actions: {
  onNewChat?: () => void
  onToggleSidebar?: () => void
  onFocusSearch?: () => void
  onOpenSettings?: () => void
  onShowHelp?: () => void
  onShowShortcuts?: () => void
}): KeyboardShortcut[] => {
  return [
    {
      key: 'n',
      ctrlKey: true,
      action: actions.onNewChat || (() => {}),
      description: 'New conversation',
      preventDefault: true
    },
    {
      key: 'b',
      ctrlKey: true,
      action: actions.onToggleSidebar || (() => {}),
      description: 'Toggle sidebar',
      preventDefault: true
    },
    {
      key: 'k',
      ctrlKey: true,
      action: actions.onFocusSearch || (() => {}),
      description: 'Focus search',
      preventDefault: true
    },
    {
      key: ',',
      ctrlKey: true,
      action: actions.onOpenSettings || (() => {}),
      description: 'Open settings',
      preventDefault: true
    },
    {
      key: 'F1',
      action: actions.onShowHelp || (() => {}),
      description: 'Show help',
      preventDefault: true
    },
    {
      key: '/',
      ctrlKey: true,
      action: actions.onShowShortcuts || (() => {}),
      description: 'Show keyboard shortcuts',
      preventDefault: true
    }
  ].filter(shortcut => shortcut.action !== (() => {}))
}

// Hook for managing focus and navigation
export const useKeyboardNavigation = () => {
  const focusableElementsRef = useRef<HTMLElement[]>([])

  const updateFocusableElements = useCallback(() => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ]

    const elements = document.querySelectorAll(focusableSelectors.join(', '))
    focusableElementsRef.current = Array.from(elements) as HTMLElement[]
  }, [])

  const focusNext = useCallback(() => {
    updateFocusableElements()
    const currentIndex = focusableElementsRef.current.indexOf(document.activeElement as HTMLElement)
    const nextIndex = (currentIndex + 1) % focusableElementsRef.current.length
    focusableElementsRef.current[nextIndex]?.focus()
  }, [updateFocusableElements])

  const focusPrevious = useCallback(() => {
    updateFocusableElements()
    const currentIndex = focusableElementsRef.current.indexOf(document.activeElement as HTMLElement)
    const prevIndex = currentIndex <= 0 ? focusableElementsRef.current.length - 1 : currentIndex - 1
    focusableElementsRef.current[prevIndex]?.focus()
  }, [updateFocusableElements])

  const focusFirst = useCallback(() => {
    updateFocusableElements()
    focusableElementsRef.current[0]?.focus()
  }, [updateFocusableElements])

  const focusLast = useCallback(() => {
    updateFocusableElements()
    const lastElement = focusableElementsRef.current[focusableElementsRef.current.length - 1]
    lastElement?.focus()
  }, [updateFocusableElements])

  // Set up keyboard navigation shortcuts
  useKeyboardShortcuts([
    {
      key: 'Tab',
      action: focusNext,
      description: 'Move to next focusable element',
      preventDefault: false
    },
    {
      key: 'Tab',
      shiftKey: true,
      action: focusPrevious,
      description: 'Move to previous focusable element',
      preventDefault: false
    },
    {
      key: 'Home',
      ctrlKey: true,
      action: focusFirst,
      description: 'Focus first element',
      preventDefault: true
    },
    {
      key: 'End',
      ctrlKey: true,
      action: focusLast,
      description: 'Focus last element',
      preventDefault: true
    }
  ])

  return {
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    updateFocusableElements
  }
}

export default useKeyboardShortcuts