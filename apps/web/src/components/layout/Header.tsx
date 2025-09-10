'use client'

import { useState, Suspense, lazy, useEffect } from 'react'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { ModelSelector } from '../chat/ModelSelector'
import { ThemeToggle } from './ThemeToggle'
import { OrganizationSwitcher } from '../organization/OrganizationSwitcher'
import { CompactOfflineIndicator } from '../ui/OfflineIndicator'
import { isUserAdmin } from '../../lib/adminUtils'
import { useRouter } from 'next/navigation'

// Lazy load SettingsModal for better performance
const SettingsModal = lazy(() => import('../settings/SettingsModal').then(module => ({ default: module.SettingsModal })))

interface HeaderProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function Header({ onToggleSidebar, sidebarOpen }: HeaderProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminStatus()
  }, [user])

  const checkAdminStatus = async () => {
    if (user) {
      const adminStatus = await isUserAdmin()
      setIsAdmin(adminStatus)
    } else {
      setIsAdmin(false)
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Sidebar toggle and title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sleek Chat
          </h1>

          {/* Organization Switcher */}
          <OrganizationSwitcher />
        </div>

        {/* Center - Model selector */}
        <div className="flex-1 max-w-md mx-4">
          <ModelSelector />
        </div>

        {/* Right side - User menu and settings */}
        <div className="flex items-center space-x-2">
          <CompactOfflineIndicator />
          <ThemeToggle />

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>

            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.email}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowSettings(false)
                    setShowSettingsModal(true)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  API Key Settings
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowSettings(false)
                      router.push('/admin')
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Admin Panel
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowSettings(false)
                    signOut()
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>}>
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      </Suspense>
    </header>
  )
}