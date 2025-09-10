'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { Header } from './layout/Header'
import { Sidebar } from './chat/Sidebar'
import { ChatArea } from './chat/ChatArea'
import { MessageInput } from './chat/MessageInput'
import { useAuth } from '../contexts/SimpleAuthContext'
import { conversationService } from '../lib/database'
import { useErrorHandling } from '../hooks/useErrorHandling'
import { ToastContainer } from './ui/Toast'
import { useOfflineStorage } from '../hooks/useOfflineStorage'
import { SyncToast } from './ui/SyncStatus'
import { InstallPrompt } from './ui/InstallPrompt'

interface ToastItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

export function ChatInterface() {
  const { user } = useAuth()
  const { handleError } = useErrorHandling()
  const { isOnline, syncStatus } = useOfflineStorage()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Toast management functions
  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const error = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    addToast({
      type: 'error',
      message,
      title: options?.title,
      duration: options?.duration
    })
  }, [addToast])

  const handleNewConversation = () => {
    if (!user) {
      error('Authentication Required', {
        title: 'Please sign in to continue',
        duration: 4000
      })
      return
    }

    startTransition(async () => {
      try {
        const newConversation = await conversationService.create('New Chat')
        setSelectedConversationId(newConversation.id)

        // Show success message
        addToast({
          type: 'success',
          message: 'New conversation created',
          duration: 3000
        })
      } catch (err: any) {
        console.error('Failed to create conversation:', err)
        const errorInfo = handleError(err)

        // If offline, queue the request and show offline message
        if (!isOnline) {
          addToast({
            type: 'info',
            message: 'Conversation will be created when you\'re back online',
            title: 'Offline Mode',
            duration: 5000
          })
          // TODO: Queue the conversation creation for later sync
        } else {
          error(errorInfo.message, {
            title: 'Failed to Create Conversation',
            duration: 6000
          })
        }
      }
    })
  }

  // Listen for sync events and show notifications
  useEffect(() => {
    const handleSyncComplete = () => {
      if (syncStatus.lastSync) {
        addToast({
          type: 'success',
          message: 'Your changes have been synced',
          duration: 3000
        })
      }
    }

    const handleOffline = () => {
      addToast({
        type: 'warning',
        message: 'You\'re now offline. You can continue chatting and changes will sync when you\'re back online.',
        title: 'Offline Mode',
        duration: 5000
      })
    }

    const handleOnline = () => {
      addToast({
        type: 'info',
        message: 'You\'re back online. Syncing your changes...',
        title: 'Back Online',
        duration: 3000
      })
    }

    // Listen for online/offline events
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    // Listen for sync completion (this would be triggered by the service worker)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          handleSyncComplete()
        }
      })
    }

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [syncStatus.lastSync, addToast])

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 dark:bg-gray-800">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="w-80 h-full flex-shrink-0">
            <Sidebar
              isOpen={sidebarOpen}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              onNewConversation={handleNewConversation}
              isCreating={isPending}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatArea conversationId={selectedConversationId} />
          <MessageInput
            conversationId={selectedConversationId}
            onConversationCreated={setSelectedConversationId}
          />
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="top-right"
      />

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  )
}
