'use client'

import { useState, useEffect, useCallback } from 'react'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  required: boolean
}

export interface OnboardingState {
  hasCompletedTour: boolean
  completedSteps: string[]
  currentStep?: string
  isActive: boolean
}

export const useOnboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    hasCompletedTour: false,
    completedSteps: [],
    isActive: false
  })

  // Load onboarding state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('onboardingState')
    if (stored) {
      try {
        const parsedState = JSON.parse(stored)
        setState(parsedState)
      } catch (error) {
        console.error('Failed to parse onboarding state:', error)
      }
    }
  }, [])

  // Save onboarding state to localStorage
  const saveState = useCallback((newState: Partial<OnboardingState>) => {
    const updatedState = { ...state, ...newState }
    setState(updatedState)
    localStorage.setItem('onboardingState', JSON.stringify(updatedState))
  }, [state])

  const startTour = useCallback(() => {
    saveState({ isActive: true, currentStep: 'welcome' })
  }, [saveState])

  const completeTour = useCallback(() => {
    saveState({
      hasCompletedTour: true,
      isActive: false,
      currentStep: undefined
    })
  }, [saveState])

  const skipTour = useCallback(() => {
    saveState({
      hasCompletedTour: true,
      isActive: false,
      currentStep: undefined
    })
  }, [saveState])

  const markStepCompleted = useCallback((stepId: string) => {
    const newCompletedSteps = [...state.completedSteps]
    if (!newCompletedSteps.includes(stepId)) {
      newCompletedSteps.push(stepId)
      saveState({ completedSteps: newCompletedSteps })
    }
  }, [state.completedSteps, saveState])

  const setCurrentStep = useCallback((stepId: string) => {
    saveState({ currentStep: stepId })
  }, [saveState])

  const resetOnboarding = useCallback(() => {
    const resetState: OnboardingState = {
      hasCompletedTour: false,
      completedSteps: [],
      isActive: false
    }
    setState(resetState)
    localStorage.setItem('onboardingState', JSON.stringify(resetState))
    // Also reset feature hints
    localStorage.removeItem('discoveredFeatures')
    localStorage.removeItem('dismissedFeatureHints')
  }, [])

  const shouldShowWelcome = useCallback(() => {
    return !state.hasCompletedTour && !state.isActive
  }, [state.hasCompletedTour, state.isActive])

  const getProgress = useCallback((totalSteps: number) => {
    return Math.round((state.completedSteps.length / totalSteps) * 100)
  }, [state.completedSteps.length])

  const isStepCompleted = useCallback((stepId: string) => {
    return state.completedSteps.includes(stepId)
  }, [state.completedSteps])

  return {
    // State
    hasCompletedTour: state.hasCompletedTour,
    completedSteps: state.completedSteps,
    currentStep: state.currentStep,
    isActive: state.isActive,

    // Actions
    startTour,
    completeTour,
    skipTour,
    markStepCompleted,
    setCurrentStep,
    resetOnboarding,

    // Helpers
    shouldShowWelcome,
    getProgress,
    isStepCompleted
  }
}

// Hook for managing sample conversations
export const useSampleConversations = () => {
  const [hasUsedSample, setHasUsedSample] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('hasUsedSampleConversation')
    setHasUsedSample(stored === 'true')
  }, [])

  const markSampleUsed = useCallback(() => {
    setHasUsedSample(true)
    localStorage.setItem('hasUsedSampleConversation', 'true')
  }, [])

  const resetSampleUsage = useCallback(() => {
    setHasUsedSample(false)
    localStorage.removeItem('hasUsedSampleConversation')
  }, [])

  const sampleConversations = [
    {
      id: 'getting-started',
      title: 'Getting Started with AI',
      messages: [
        {
          role: 'user',
          content: 'Hello! Can you help me get started with using AI chat?'
        },
        {
          role: 'assistant',
          content: 'Absolutely! I\'m here to help you explore the possibilities of AI conversation. You can ask me questions, request explanations, get writing assistance, brainstorm ideas, or just have a friendly chat. What would you like to try first?'
        }
      ]
    },
    {
      id: 'coding-help',
      title: 'Coding Assistance',
      messages: [
        {
          role: 'user',
          content: 'I need help with a JavaScript function that sorts an array of objects by a specific property.'
        },
        {
          role: 'assistant',
          content: 'I\'d be happy to help with that! Here\'s an example of how to sort an array of objects by a specific property in JavaScript:\n\n```javascript\nconst sortByProperty = (array, property) => {\n  return array.sort((a, b) => {\n    if (a[property] < b[property]) return -1;\n    if (a[property] > b[property]) return 1;\n    return 0;\n  });\n};\n\n// Example usage\nconst users = [\n  { name: \'Alice\', age: 25 },\n  { name: \'Bob\', age: 30 },\n  { name: \'Charlie\', age: 20 }\n];\n\nconst sortedUsers = sortByProperty(users, \'age\');\n```\n\nWould you like me to explain how this works or help you adapt it to your specific use case?'
        }
      ]
    },
    {
      id: 'writing-assistance',
      title: 'Writing Help',
      messages: [
        {
          role: 'user',
          content: 'Can you help me write a professional email to request a meeting with my team?'
        },
        {
          role: 'assistant',
          content: 'Of course! Here\'s a professional email template for requesting a team meeting:\n\n---\n\nSubject: Request for Team Meeting - [Topic/Agenda]\n\nDear Team,\n\nI hope this email finds you well. I\'d like to schedule a team meeting to discuss [brief description of the topic]. \n\nProposed agenda:\n• [Point 1]\n• [Point 2]\n• [Point 3]\n\nSuggested time: [Date/Time options]\nDuration: [Estimated duration]\n\nPlease let me know your availability or suggest alternative times that work for everyone. I\'m happy to adjust the agenda based on your input.\n\nBest regards,\n[Your Name]\n[Your Position]\n[Contact Information]\n\n---\n\nFeel free to customize this template with your specific details!'
        }
      ]
    }
  ]

  return {
    sampleConversations,
    hasUsedSample,
    markSampleUsed,
    resetSampleUsage
  }
}

export default useOnboarding