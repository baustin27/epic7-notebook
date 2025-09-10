'use client'

import { useEffect } from 'react'

const useKeyboardNavigation = () => {
  const closeModals = () => {
    // Implementation for closing modals - to be integrated with modal state
    console.log('Close modals triggered')
  }

  const navigateToPreviousConversation = () => {
    // Implementation for navigating to previous conversation
    console.log('Navigate to previous conversation')
  }

  const navigateToNextConversation = () => {
    // Implementation for navigating to next conversation
    console.log('Navigate to next conversation')
  }

  const createNewConversation = () => {
    // Implementation for creating new conversation
    console.log('Create new conversation')
  }

  const handleGlobalKeyDown = (event: KeyboardEvent) => {
    // Escape key handling
    if (event.key === 'Escape') {
      closeModals()
      return
    }
    
    // Skip links (Alt + number)
    if (event.altKey && event.key >= '1' && event.key <= '9') {
      const skipTargetId = `skip-${event.key}`
      const target = document.getElementById(skipTargetId)
      if (target) {
        target.focus()
        event.preventDefault()
      }
      return
    }
    
    // Conversation navigation (Ctrl + Arrow keys or n)
    if (event.ctrlKey) {
      switch (event.key) {
        case 'ArrowUp':
          navigateToPreviousConversation()
          event.preventDefault()
          break
        case 'ArrowDown':
          navigateToNextConversation()
          event.preventDefault()
          break
        case 'n':
          createNewConversation()
          event.preventDefault()
          break
      }
    }
  }
  
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleGlobalKeyDown])
}

export { useKeyboardNavigation }