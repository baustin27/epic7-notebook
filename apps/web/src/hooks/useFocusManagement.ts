'use client'

import { useEffect, useRef } from 'react'

interface UseFocusManagementProps {
  isOpen: boolean
  modalRef: React.RefObject<HTMLElement>
  triggerRef?: React.RefObject<HTMLElement>
}

const useFocusManagement = ({ isOpen, modalRef, triggerRef }: UseFocusManagementProps) => {
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Save current active element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus first focusable element in modal
    if (modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstFocusable = focusableElements[0] as HTMLElement
      if (firstFocusable) {
        firstFocusable.focus()
      }
    }

    const handleTab = (e: KeyboardEvent) => {
      if (!modalRef.current) return

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>
      )

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => {
      document.removeEventListener('keydown', handleTab)
      // Restore focus to trigger or previous element
      if (triggerRef?.current) {
        triggerRef.current.focus()
      } else if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, modalRef, triggerRef])
}

export { useFocusManagement }