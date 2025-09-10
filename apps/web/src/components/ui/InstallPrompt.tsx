'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface InstallPromptProps {
  className?: string
  delay?: number // Delay before showing prompt (ms)
  engagementThreshold?: number // Minimum engagement score to show prompt
}

export function InstallPrompt({ className = '', delay = 30000, engagementThreshold = 3 }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [engagementScore, setEngagementScore] = useState(0)

  // Track user engagement
  useEffect(() => {
    const trackEngagement = () => {
      setEngagementScore(prev => prev + 1)
    }

    // Track various engagement signals
    const handleClick = () => trackEngagement()
    const handleScroll = () => trackEngagement()
    const handleKeyPress = () => trackEngagement()

    document.addEventListener('click', handleClick)
    document.addEventListener('scroll', handleScroll)
    document.addEventListener('keypress', handleKeyPress)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('scroll', handleScroll)
      document.removeEventListener('keypress', handleKeyPress)
    }
  }, [])

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Show prompt after delay and engagement threshold
  useEffect(() => {
    if (!deferredPrompt || isInstalled || showPrompt) return

    const timer = setTimeout(() => {
      if (engagementScore >= engagementThreshold) {
        setShowPrompt(true)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [deferredPrompt, isInstalled, showPrompt, engagementScore, delay, engagementThreshold])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }

      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error('Error during installation:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Store dismissal to avoid showing again soon
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
    }
  }

  // Check if dismissed recently (within 7 days) on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastDismissed = localStorage.getItem('pwa-prompt-dismissed')
      if (lastDismissed && Date.now() - parseInt(lastDismissed) < 7 * 24 * 60 * 60 * 1000) {
        setShowPrompt(false)
        return
      }
    }
  }, [])

  if (!showPrompt || !deferredPrompt || isInstalled) {
    return null
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Install Sleek Chat
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Get the full experience with offline access, faster loading, and native app features.
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                <span>Mobile</span>
              </div>
              <div className="flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                <span>Desktop</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for managing PWA installation
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return outcome === 'accepted'
    } catch (error) {
      console.error('Error during installation:', error)
      return false
    }
  }

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    install
  }
}