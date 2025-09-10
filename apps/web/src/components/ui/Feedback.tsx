'use client'

import React, { useState, useEffect } from 'react'

// Copy to clipboard feedback
interface CopyFeedbackProps {
  text: string
  children: React.ReactNode
  successMessage?: string
  className?: string
}

export const CopyFeedback: React.FC<CopyFeedbackProps> = ({
  text,
  children,
  successMessage = 'Copied!',
  className = ''
}) => {
  const [showFeedback, setShowFeedback] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setShowFeedback(true)
      setTimeout(() => setShowFeedback(false), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleCopy}
        className="relative"
        aria-label="Copy to clipboard"
      >
        {children}
      </button>

      {showFeedback && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg animate-in fade-in-0 zoom-in-95">
          {successMessage}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}

// Success animation for actions
interface SuccessAnimationProps {
  show: boolean
  children: React.ReactNode
  className?: string
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  show,
  children,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {show && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-green-500 text-white rounded-full p-2 animate-ping">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

// Hover effect with micro-feedback
interface HoverFeedbackProps {
  children: React.ReactNode
  scale?: number
  className?: string
  onHover?: () => void
  onLeave?: () => void
}

export const HoverFeedback: React.FC<HoverFeedbackProps> = ({
  children,
  scale = 1.05,
  className = '',
  onHover,
  onLeave
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    onHover?.()
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    onLeave?.()
  }

  return (
    <div
      className={`transition-transform duration-200 ease-out ${className}`}
      style={{
        transform: isHovered ? `scale(${scale})` : 'scale(1)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

// Contextual actions that appear on hover
interface ContextualActionsProps {
  children: React.ReactNode
  actions: Array<{
    icon: React.ReactNode
    label: string
    onClick: () => void
    className?: string
  }>
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export const ContextualActions: React.FC<ContextualActionsProps> = ({
  children,
  actions,
  position = 'top',
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2'
      case 'bottom':
        return 'top-full mt-2'
      case 'left':
        return 'right-full mr-2'
      case 'right':
        return 'left-full ml-2'
      default:
        return 'bottom-full mb-2'
    }
  }

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {isHovered && actions.length > 0 && (
        <div className={`absolute ${getPositionClasses()} flex space-x-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-10 animate-in fade-in-0 zoom-in-95`}>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${action.className || ''}`}
              title={action.label}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Form validation feedback
interface ValidationFeedbackProps {
  isValid?: boolean
  message?: string
  showIcon?: boolean
  className?: string
}

export const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  isValid,
  message,
  showIcon = true,
  className = ''
}) => {
  if (!message) return null

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {showIcon && (
        <div className={`flex-shrink-0 ${isValid ? 'text-green-500' : 'text-red-500'}`}>
          {isValid ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      )}
      <span className={isValid ? 'text-green-700' : 'text-red-700'}>
        {message}
      </span>
    </div>
  )
}

// Drag and drop feedback
interface DragFeedbackProps {
  isDragging: boolean
  isOver: boolean
  children: React.ReactNode
  dragMessage?: string
  dropMessage?: string
  className?: string
}

export const DragFeedback: React.FC<DragFeedbackProps> = ({
  isDragging,
  isOver,
  children,
  dragMessage = 'Drag to move',
  dropMessage = 'Drop here',
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}

      {isDragging && (
        <div className="absolute inset-0 bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-blue-600 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-blue-700 font-medium">{dragMessage}</p>
          </div>
        </div>
      )}

      {isOver && (
        <div className="absolute inset-0 bg-green-100 border-2 border-green-300 border-dashed rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-green-600 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-green-700 font-medium">{dropMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Auto-focus utility
interface AutoFocusProps {
  children: React.ReactNode
  delay?: number
  selectText?: boolean
  className?: string
}

export const AutoFocus: React.FC<AutoFocusProps> = ({
  children,
  delay = 0,
  selectText = false,
  className = ''
}) => {
  const elementRef = React.useRef<HTMLElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (elementRef.current) {
        elementRef.current.focus()
        if (selectText && 'select' in elementRef.current) {
          (elementRef.current as HTMLInputElement).select()
        }
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [delay, selectText])

  return React.cloneElement(children as React.ReactElement, {
    ref: elementRef,
    className
  })
}

export default CopyFeedback