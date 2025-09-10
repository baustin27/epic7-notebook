'use client'

import React, { useState, useEffect, useRef } from 'react'

interface FeatureHintProps {
  featureId: string
  children: React.ReactNode
  hint: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
  onDismiss?: () => void
}

export const FeatureHint: React.FC<FeatureHintProps> = ({
  featureId,
  children,
  hint,
  position = 'top',
  delay = 2000,
  className = '',
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenShown, setHasBeenShown] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const hintRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if this feature hint has been dismissed before
    const dismissedHints = localStorage.getItem('dismissedFeatureHints')
    const dismissed = dismissedHints ? JSON.parse(dismissedHints) : []

    if (!dismissed.includes(featureId)) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true)
        setHasBeenShown(true)
      }, delay)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [featureId, delay])

  const handleDismiss = () => {
    setIsVisible(false)

    // Mark as dismissed in localStorage
    const dismissedHints = localStorage.getItem('dismissedFeatureHints')
    const dismissed = dismissedHints ? JSON.parse(dismissedHints) : []
    dismissed.push(featureId)
    localStorage.setItem('dismissedFeatureHints', JSON.stringify(dismissed))

    onDismiss?.()
  }

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

  return (
    <div className={`relative inline-block ${className}`}>
      {children}

      {isVisible && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleDismiss}
          />

          {/* Hint tooltip */}
          <div
            ref={hintRef}
            className={`absolute ${getPositionClasses()} bg-gray-900 text-white text-sm rounded-lg shadow-lg px-3 py-2 max-w-xs z-50 animate-in fade-in-0 zoom-in-95`}
            style={{ animationDuration: '200ms' }}
          >
            {hint}

            {/* Arrow */}
            <div
              className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
                position === 'top' ? 'top-full -mt-1 left-1/2 -translate-x-1/2' :
                position === 'bottom' ? 'bottom-full -mb-1 left-1/2 -translate-x-1/2' :
                position === 'left' ? 'left-full -ml-1 top-1/2 -translate-y-1/2' :
                'right-full -mr-1 top-1/2 -translate-y-1/2'
              }`}
            />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-xs"
              aria-label="Dismiss hint"
            >
              ×
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Feature hint for specific UI elements
interface ElementHintProps extends Omit<FeatureHintProps, 'children'> {
  target: string // CSS selector
  content: React.ReactNode
}

export const ElementHint: React.FC<ElementHintProps> = ({
  target,
  content,
  ...hintProps
}) => {
  const [isTargetVisible, setIsTargetVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver>()

  useEffect(() => {
    const targetElement = document.querySelector(target)
    if (!targetElement) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsTargetVisible(entry.isIntersecting)
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(targetElement)
    observerRef.current = observer

    return () => {
      observer.disconnect()
    }
  }, [target])

  if (!isTargetVisible) return null

  return (
    <FeatureHint {...hintProps}>
      <div className="absolute inset-0 pointer-events-none" />
      {content}
    </FeatureHint>
  )
}

// Progressive feature discovery system
export const useFeatureDiscovery = () => {
  const [discoveredFeatures, setDiscoveredFeatures] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = localStorage.getItem('discoveredFeatures')
    if (stored) {
      setDiscoveredFeatures(new Set(JSON.parse(stored)))
    }
  }, [])

  const markFeatureDiscovered = (featureId: string) => {
    setDiscoveredFeatures(prev => {
      const newSet = new Set(prev)
      newSet.add(featureId)
      localStorage.setItem('discoveredFeatures', JSON.stringify(Array.from(newSet)))
      return newSet
    })
  }

  const shouldShowFeatureHint = (featureId: string) => {
    return !discoveredFeatures.has(featureId)
  }

  const resetAllHints = () => {
    setDiscoveredFeatures(new Set())
    localStorage.removeItem('discoveredFeatures')
    localStorage.removeItem('dismissedFeatureHints')
  }

  return {
    markFeatureDiscovered,
    shouldShowFeatureHint,
    resetAllHints,
    discoveredFeatures: Array.from(discoveredFeatures)
  }
}

export default FeatureHint