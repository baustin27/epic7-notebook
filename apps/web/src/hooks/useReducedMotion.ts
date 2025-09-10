'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect and respect user's motion preferences
 * Returns true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      
      // Set initial state
      setPrefersReducedMotion(mediaQuery.matches)
      
      // Listen for changes
      const handleChange = (event: MediaQueryListEvent) => {
        setPrefersReducedMotion(event.matches)
      }
      
      mediaQuery.addEventListener('change', handleChange)
      
      // Cleanup
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return prefersReducedMotion
}

/**
 * Hook to get animation classes based on motion preferences
 * Returns appropriate animation classes or empty string if motion should be reduced
 */
export function useAnimationClasses() {
  const prefersReducedMotion = useReducedMotion()
  
  return {
    // Micro-interactions
    buttonHover: prefersReducedMotion ? '' : 'hover:scale-105 transition-transform duration-200 ease-out',
    buttonActive: prefersReducedMotion ? '' : 'active:scale-95 transition-transform duration-75 ease-out',
    buttonPress: prefersReducedMotion ? '' : 'active:animate-button-press',
    gentleBounce: prefersReducedMotion ? '' : 'animate-gentle-bounce',
    
    // Component transitions
    modalEnter: prefersReducedMotion ? 'opacity-100' : 'animate-modal-enter',
    modalExit: prefersReducedMotion ? 'opacity-0' : 'animate-modal-exit',
    messageAppear: prefersReducedMotion ? 'opacity-100' : 'animate-message-appear',
    slideInUp: prefersReducedMotion ? 'opacity-100' : 'animate-slide-in-up',
    slideInRight: prefersReducedMotion ? 'opacity-100' : 'animate-slide-in-right',
    
    // Hover effects
    messageHover: prefersReducedMotion ? '' : 'hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ease-out',
    cardHover: prefersReducedMotion ? '' : 'hover:shadow-md hover:-translate-y-1 transition-all duration-200 ease-out',
    
    // Loading states
    pulseGentle: prefersReducedMotion ? 'opacity-70' : 'animate-pulse-gentle',
    skeletonPulse: prefersReducedMotion ? 'bg-gray-200 dark:bg-gray-700' : 'animate-skeleton-pulse',
    
    // Focus states
    focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200',
    
    prefersReducedMotion
  }
}