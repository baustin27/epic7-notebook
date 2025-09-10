'use client'

import React, { useState, useEffect } from 'react'

interface TourStep {
  id: string
  title: string
  description: string
  target: string // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right'
  content: React.ReactNode
}

interface WelcomeTourProps {
  isOpen: boolean
  onComplete: () => void
  onSkip: () => void
  steps?: TourStep[]
}

export const WelcomeTour: React.FC<WelcomeTourProps> = ({
  isOpen,
  onComplete,
  onSkip,
  steps: customSteps
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  const defaultSteps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to AI Chat!',
      description: 'Let\'s take a quick tour to get you started.',
      target: 'body',
      position: 'top',
      content: (
        <div className="text-center">
          <div className="text-4xl mb-4">🎉</div>
          <p className="text-gray-600">
            Welcome to your AI-powered chat assistant! This quick tour will help you get started.
          </p>
        </div>
      )
    },
    {
      id: 'chat-area',
      title: 'Chat Area',
      description: 'This is where your conversations with AI happen.',
      target: '[data-tour="chat-area"]',
      position: 'bottom',
      content: (
        <div>
          <p className="text-gray-600 mb-2">
            Send messages to AI assistants and receive intelligent responses.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Type your message below</li>
            <li>• Use the model selector to choose different AI models</li>
            <li>• Messages are saved automatically</li>
          </ul>
        </div>
      )
    },
    {
      id: 'sidebar',
      title: 'Conversation History',
      description: 'Access your previous conversations.',
      target: '[data-tour="sidebar"]',
      position: 'right',
      content: (
        <div>
          <p className="text-gray-600 mb-2">
            Your conversation history is stored here for easy access.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Click to switch between conversations</li>
            <li>• Search through your chat history</li>
            <li>• Create new conversations anytime</li>
          </ul>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'Settings & Preferences',
      description: 'Customize your experience.',
      target: '[data-tour="settings"]',
      position: 'bottom',
      content: (
        <div>
          <p className="text-gray-600 mb-2">
            Configure your AI chat experience to match your preferences.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Choose your preferred AI models</li>
            <li>• Adjust theme and appearance</li>
            <li>• Manage API keys and integrations</li>
          </ul>
        </div>
      )
    }
  ]

  const steps = customSteps || defaultSteps

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setCurrentStep(0)
      document.body.style.overflow = 'hidden'
    } else {
      setIsVisible(false)
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    setIsVisible(false)
    setTimeout(() => {
      onComplete()
    }, 300)
  }

  const handleSkip = () => {
    setIsVisible(false)
    setTimeout(() => {
      onSkip()
    }, 300)
  }

  if (!isOpen || !isVisible) return null

  const step = steps[currentStep]
  const targetElement = document.querySelector(step.target) as HTMLElement | null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300" />

      {/* Highlight target element */}
      {targetElement && (
        <div
          className="absolute border-2 border-blue-500 rounded-lg pointer-events-none transition-all duration-300"
          style={{
            top: targetElement.offsetTop - 4,
            left: targetElement.offsetLeft - 4,
            width: targetElement.offsetWidth + 8,
            height: targetElement.offsetHeight + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}
        />
      )}

      {/* Tour tooltip */}
      <div
        className={`absolute bg-white rounded-lg shadow-xl border border-gray-200 p-6 max-w-sm pointer-events-auto transition-all duration-300 ${
          step.position === 'top' ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' :
          step.position === 'bottom' ? 'top-full mt-2 left-1/2 transform -translate-x-1/2' :
          step.position === 'left' ? 'right-full mr-2 top-1/2 transform -translate-y-1/2' :
          'left-full ml-2 top-1/2 transform -translate-y-1/2'
        }`}
        style={{
          ...(targetElement && {
            top: step.position === 'top' ? targetElement.offsetTop - 8 :
                 step.position === 'bottom' ? targetElement.offsetTop + targetElement.offsetHeight + 8 :
                 targetElement.offsetTop + targetElement.offsetHeight / 2,
            left: step.position === 'left' ? targetElement.offsetLeft - 8 :
                  step.position === 'right' ? targetElement.offsetLeft + targetElement.offsetWidth + 8 :
                  targetElement.offsetLeft + targetElement.offsetWidth / 2
          })
        }}
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
          {step.content}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip
            </button>
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeTour