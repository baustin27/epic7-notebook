'use client'

import React, { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  content: string | React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  disabled?: boolean
  className?: string
  children: React.ReactNode
  maxWidth?: number
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 300,
  disabled = false,
  className = '',
  children,
  maxWidth = 200
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    if (disabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      setIsExiting(false)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
    }, 150) // Match animation duration
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        hideTooltip()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2'
      case 'bottom':
        return 'top-full mt-2 left-1/2 transform -translate-x-1/2'
      case 'left':
        return 'right-full mr-2 top-1/2 transform -translate-y-1/2'
      case 'right':
        return 'left-full ml-2 top-1/2 transform -translate-y-1/2'
      default:
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2'
    }
  }

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full -mt-1 left-1/2 transform -translate-x-1/2'
      case 'bottom':
        return 'bottom-full -mb-1 left-1/2 transform -translate-x-1/2'
      case 'left':
        return 'left-full -ml-1 top-1/2 transform -translate-y-1/2'
      case 'right':
        return 'right-full -mr-1 top-1/2 transform -translate-y-1/2'
      default:
        return 'top-full -mt-1 left-1/2 transform -translate-x-1/2'
    }
  }

  if (disabled) {
    return <>{children}</>
  }

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {isVisible && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={hideTooltip}
          />

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className={`absolute ${getPositionClasses()} bg-gray-900 text-white text-sm rounded-lg shadow-lg px-3 py-2 z-50 pointer-events-none transition-all duration-150 ease-out ${
              isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
            style={{ maxWidth: `${maxWidth}px` }}
            role="tooltip"
          >
            {content}

            {/* Arrow */}
            <div
              className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${getArrowClasses()}`}
            />
          </div>
        </>
      )}
    </div>
  )
}

// Smart tooltip that adapts position based on viewport
interface SmartTooltipProps extends Omit<TooltipProps, 'position'> {
  preferredPosition?: 'top' | 'bottom' | 'left' | 'right'
}

export const SmartTooltip = React.forwardRef<HTMLDivElement, SmartTooltipProps>(({
  preferredPosition = 'top',
  ...props
}, ref) => {
  const [actualPosition, setActualPosition] = useState(preferredPosition)

  useEffect(() => {
    if (!ref || typeof ref === 'function' || !ref.current) return

    const tooltip = ref.current
    const rect = tooltip.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Check if tooltip is outside viewport and adjust position
    let newPosition = preferredPosition

    if (rect.left < 0) {
      newPosition = 'right'
    } else if (rect.right > viewportWidth) {
      newPosition = 'left'
    } else if (rect.top < 0) {
      newPosition = 'bottom'
    } else if (rect.bottom > viewportHeight) {
      newPosition = 'top'
    }

    if (newPosition !== actualPosition) {
      setActualPosition(newPosition)
    }
  }, [preferredPosition, actualPosition, ref])

  return (
    <Tooltip
      {...props}
      position={actualPosition}
    />
  )
})

SmartTooltip.displayName = 'SmartTooltip'

export default Tooltip