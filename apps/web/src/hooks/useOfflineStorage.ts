import { useState, useEffect, useCallback, useRef } from 'react'
import type { Database } from '../types/database'

type Tables = Database['public']['Tables']
type Conversation = Tables['conversations']['Row']
type Message = Tables['messages']['Row']

interface OfflineQueueItem {
  id?: number
  url: string
  method: string
  headers: Record<string, string>
  body?: string
  timestamp: number
  retryCount: number
}

interface SyncStatus {
  isOnline: boolean
  lastSync: Date | null
  pendingItems: number
  isSyncing: boolean
}

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingItems: 0,
    isSyncing: false
  })

  const isOnlineRef = useRef(isOnline)
  const syncStatusRef = useRef(syncStatus)

  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])

  useEffect(() => {
    syncStatusRef.current = syncStatus
  }, [syncStatus])

  // Initialize IndexedDB
  const initDB = useCallback(() => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sleek-chat-offline', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = event.target as IDBOpenDBRequest
        const database = db.result

        // Conversations store
        if (!database.objectStoreNames.contains('conversations')) {
          const convStore = database.createObjectStore('conversations', { keyPath: 'id' })
          convStore.createIndex('user_id', 'user_id', { unique: false })
          convStore.createIndex('updated_at', 'updated_at', { unique: false })
        }

        // Messages store
        if (!database.objectStoreNames.contains('messages')) {
          const msgStore = database.createObjectStore('messages', { keyPath: 'id' })
          msgStore.createIndex('conversation_id', 'conversation_id', { unique: false })
          msgStore.createIndex('created_at', 'created_at', { unique: false })
        }

        // Offline queue store
        if (!database.objectStoreNames.contains('offline_queue')) {
          database.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true })
        }

        // Sync metadata store
        if (!database.objectStoreNames.contains('sync_metadata')) {
          database.createObjectStore('sync_metadata', { keyPath: 'key' })
        }
      }
    })
  }, [])

  // Store conversation data offline
  const storeConversation = useCallback(async (conversation: Conversation) => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['conversations'], 'readwrite')
      const store = transaction.objectStore('conversations')
      const request = store.put(conversation)

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error('Failed to store conversation offline:', error)
    }
  }, [initDB])

  // Store message data offline
  const storeMessage = useCallback(async (message: Message) => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['messages'], 'readwrite')
      const store = transaction.objectStore('messages')
      const request = store.put(message)

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error('Failed to store message offline:', error)
    }
  }, [initDB])

  // Get conversations from offline storage
  const getOfflineConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['conversations'], 'readonly')
      const store = transaction.objectStore('conversations')
      const request = store.getAll()

      return new Promise<Conversation[]>((resolve, reject) => {
        request.onsuccess = () => {
          const conversations = request.result as Conversation[]
          const sorted = conversations.sort((a: Conversation, b: Conversation) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
          resolve(sorted)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get offline conversations:', error)
      return []
    }
  }, [initDB])

  // Get messages for a conversation from offline storage
  const getOfflineMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['messages'], 'readonly')
      const store = transaction.objectStore('messages')
      const index = store.index('conversation_id')
      const request = index.getAll(conversationId)

      return new Promise<Message[]>((resolve, reject) => {
        request.onsuccess = () => {
          const messages = request.result as Message[]
          const sorted = messages.sort((a: Message, b: Message) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          resolve(sorted)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get offline messages:', error)
      return []
    }
  }, [initDB])

  // Add item to offline queue
  const queueOfflineRequest = useCallback(async (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['offline_queue'], 'readwrite')
      const store = transaction.objectStore('offline_queue')
      const request = store.add({
        ...item,
        timestamp: Date.now(),
        retryCount: 0
      })

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          updatePendingItemsCount()
          resolve()
        }
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error('Failed to queue offline request:', error)
    }
  }, [initDB])

  // Process offline queue
  const processOfflineQueue = useCallback(async () => {
    setSyncStatus(prev => {
      if (!isOnlineRef.current || prev.isSyncing) return prev
      return { ...prev, isSyncing: true }
    })

    try {
      const db = await initDB()
      const transaction = db.transaction(['offline_queue'], 'readonly')
      const store = transaction.objectStore('offline_queue')
      const request = store.getAll()

      const pendingItems = await new Promise<OfflineQueueItem[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      for (const item of pendingItems) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body
          })

          if (response.ok) {
            // Remove from queue on success
            const deleteTransaction = db.transaction(['offline_queue'], 'readwrite')
            const deleteRequest = deleteTransaction.objectStore('offline_queue').delete(item.id!)
            await new Promise<void>((resolve, reject) => {
              deleteRequest.onsuccess = () => resolve()
              deleteRequest.onerror = () => reject(deleteRequest.error)
              deleteTransaction.oncomplete = () => resolve()
              deleteTransaction.onerror = () => reject(deleteTransaction.error)
            })
          } else {
            // Increment retry count
            const updateTransaction = db.transaction(['offline_queue'], 'readwrite')
            const updateStore = updateTransaction.objectStore('offline_queue')
            const updateRequest = updateStore.put({ ...item, retryCount: item.retryCount + 1 })
            await new Promise<void>((resolve, reject) => {
              updateRequest.onsuccess = () => resolve()
              updateRequest.onerror = () => reject(updateRequest.error)
              updateTransaction.oncomplete = () => resolve()
              updateTransaction.onerror = () => reject(updateTransaction.error)
            })
          }
        } catch (error) {
          console.error('Failed to sync item:', item.id, error)
          // Increment retry count
          const updateTransaction = db.transaction(['offline_queue'], 'readwrite')
          const updateStore = updateTransaction.objectStore('offline_queue')
          const updateRequest = updateStore.put({ ...item, retryCount: item.retryCount + 1 })
          await new Promise<void>((resolve, reject) => {
            updateRequest.onsuccess = () => resolve()
            updateRequest.onerror = () => reject(updateRequest.error)
            updateTransaction.oncomplete = () => resolve()
            updateTransaction.onerror = () => reject(updateTransaction.error)
          })
        }
      }

      // Update sync metadata
      const metadataTransaction = db.transaction(['sync_metadata'], 'readwrite')
      const metadataStore = metadataTransaction.objectStore('sync_metadata')
      const metadataRequest = metadataStore.put({ key: 'lastSync', value: new Date().toISOString() })

      await new Promise<void>((resolve, reject) => {
        metadataRequest.onsuccess = () => resolve()
        metadataRequest.onerror = () => reject(metadataRequest.error)
        metadataTransaction.oncomplete = () => resolve()
        metadataTransaction.onerror = () => reject(metadataTransaction.error)
      })

      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        isSyncing: false
      }))

      updatePendingItemsCount()
    } catch (error) {
      console.error('Failed to process offline queue:', error)
      setSyncStatus(prev => ({ ...prev, isSyncing: false }))
    }
  }, [initDB])

  // Update pending items count
  const updatePendingItemsCount = useCallback(async () => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['offline_queue'], 'readonly')
      const store = transaction.objectStore('offline_queue')
      const countRequest = store.count()

      const count = await new Promise<number>((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result)
        countRequest.onerror = () => reject(countRequest.error)
      })

      setSyncStatus(prev => ({ ...prev, pendingItems: count }))
    } catch (error) {
      console.error('Failed to update pending items count:', error)
    }
  }, [initDB])

  // Clear offline data (for privacy/data management)
  const clearOfflineData = useCallback(async () => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['conversations', 'messages', 'offline_queue'], 'readwrite')

      const clearPromises = [
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('conversations').clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('messages').clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('offline_queue').clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      ]

      await Promise.all(clearPromises)

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
          updatePendingItemsCount()
          resolve()
        }
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error('Failed to clear offline data:', error)
    }
  }, [initDB]) // Removed updatePendingItemsCount from dependency to break loop

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus(prev => ({ ...prev, isOnline: true }))
      // Process queue when coming back online
      setTimeout(() => processOfflineQueue(), 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [processOfflineQueue]) // Removed updatePendingItemsCount

  // Initial pending items count - separate effect to avoid dependency loop
  useEffect(() => {
    updatePendingItemsCount()
  }, []) // Empty dependency array - only run once on mount

  // Periodic sync when online
  useEffect(() => {
    if (!isOnline) return

    const interval = setInterval(() => {
      processOfflineQueue()
    }, 30000) // Sync every 30 seconds when online

    return () => clearInterval(interval)
  }, [isOnline, processOfflineQueue])

  return {
    isOnline,
    syncStatus,
    storeConversation,
    storeMessage,
    getOfflineConversations,
    getOfflineMessages,
    queueOfflineRequest,
    processOfflineQueue,
    clearOfflineData
  }
}