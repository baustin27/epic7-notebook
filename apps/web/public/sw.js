const CACHE_NAME = 'sleek-chat-v2'
const STATIC_CACHE = 'sleek-chat-static-v2'
const DYNAMIC_CACHE = 'sleek-chat-dynamic-v2'
const CONVERSATION_CACHE = 'sleek-chat-conversations-v2'
const OFFLINE_QUEUE = 'sleek-chat-offline-queue-v2'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html',
  '/_next/static/css/',
  '/_next/static/js/',
  // Add other critical assets
]

// Conversation-related API endpoints
const CONVERSATION_ENDPOINTS = [
  '/api/conversations',
  '/api/messages',
  '/api/search'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error)
      })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return

  // Handle conversation API requests with offline support
  if (CONVERSATION_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    event.respondWith(handleConversationRequest(request))
    return
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request)
        })
    )
    return
  }

  // Handle static assets with cache-first strategy
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response
          }
          return fetch(request).then((response) => {
            // Cache the response
            const responseClone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
            return response
          })
        })
    )
    return
  }

  // Default strategy: network-first for HTML pages
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request)
          .then((response) => {
            if (response) {
              return response
            }
            // Return offline fallback page if available
            if (request.destination === 'document') {
              return caches.match('/offline.html')
            }
          })
      })
  )
})

// Handle conversation requests with offline support
async function handleConversationRequest(request) {
  const url = new URL(request.url)

  try {
    // Try network first
    const networkResponse = await fetch(request)

    if (networkResponse.status === 200) {
      // Cache successful responses for conversations and messages
      const responseClone = networkResponse.clone()
      caches.open(CONVERSATION_CACHE).then((cache) => {
        cache.put(request, responseClone)
      })

      // Store in IndexedDB for offline access
      if (url.pathname.includes('/conversations') || url.pathname.includes('/messages')) {
        storeConversationData(request, responseClone)
      }
    }

    return networkResponse
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', error)

    // Try cache fallback
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Try IndexedDB fallback for conversation data
    if (url.pathname.includes('/conversations') || url.pathname.includes('/messages')) {
      const offlineResponse = await getOfflineConversationData(request)
      if (offlineResponse) {
        return offlineResponse
      }
    }

    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html')
    }

    // Return generic offline response
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Content not available offline'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Store conversation data in IndexedDB
async function storeConversationData(request, response) {
  try {
    const data = await response.json()
    const db = await openConversationDB()

    const transaction = db.transaction(['conversations', 'messages'], 'readwrite')
    const convStore = transaction.objectStore('conversations')
    const msgStore = transaction.objectStore('messages')

    if (request.url.includes('/conversations')) {
      if (Array.isArray(data)) {
        // Store multiple conversations
        data.forEach(conv => convStore.put(conv))
      } else {
        // Store single conversation
        convStore.put(data)
      }
    } else if (request.url.includes('/messages')) {
      if (Array.isArray(data)) {
        // Store multiple messages
        data.forEach(msg => msgStore.put(msg))
      } else {
        // Store single message
        msgStore.put(data)
      }
    }

    await transaction.done
    console.log('Service Worker: Conversation data stored offline')
  } catch (error) {
    console.error('Service Worker: Failed to store conversation data', error)
  }
}

// Get offline conversation data from IndexedDB
async function getOfflineConversationData(request) {
  try {
    const db = await openConversationDB()
    const url = new URL(request.url)

    if (url.pathname.includes('/conversations')) {
      const transaction = db.transaction(['conversations'], 'readonly')
      const store = transaction.objectStore('conversations')

      if (url.searchParams.has('id')) {
        // Get specific conversation
        const id = url.searchParams.get('id')
        const conversation = await store.get(id)
        return new Response(JSON.stringify(conversation), {
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        // Get all conversations
        const conversations = await store.getAll()
        return new Response(JSON.stringify(conversations), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    } else if (url.pathname.includes('/messages')) {
      const transaction = db.transaction(['messages'], 'readonly')
      const store = transaction.objectStore('messages')
      const conversationId = url.searchParams.get('conversation_id')

      if (conversationId) {
        const messages = await store.index('conversation_id').getAll(conversationId)
        return new Response(JSON.stringify(messages), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  } catch (error) {
    console.error('Service Worker: Failed to get offline conversation data', error)
  }
  return null
}

// Open IndexedDB for conversations
async function openConversationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sleek-chat-offline', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' })
        convStore.createIndex('user_id', 'user_id', { unique: false })
        convStore.createIndex('updated_at', 'updated_at', { unique: false })
      }

      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
        msgStore.createIndex('conversation_id', 'conversation_id', { unique: false })
        msgStore.createIndex('created_at', 'created_at', { unique: false })
      }

      // Offline queue store
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages())
  }
})

async function doBackgroundSync() {
  try {
    console.log('Service Worker: Performing background sync')

    // Sync pending messages
    await syncPendingMessages()

    // Sync conversation updates
    await syncConversationUpdates()

    console.log('Service Worker: Background sync completed')
  } catch (error) {
    console.error('Service Worker: Background sync failed', error)
  }
}

async function syncPendingMessages() {
  try {
    const db = await openConversationDB()
    const transaction = db.transaction(['offline_queue'], 'readonly')
    const store = transaction.objectStore('offline_queue')
    const pendingItems = await store.getAll()

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
          await deleteTransaction.objectStore('offline_queue').delete(item.id)
          await deleteTransaction.done
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync pending item', item.id, error)
      }
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync pending messages', error)
  }
}

async function syncConversationUpdates() {
  try {
    // Sync any pending conversation updates
    console.log('Service Worker: Syncing conversation updates')
    // Implementation would depend on specific sync requirements
  } catch (error) {
    console.error('Service Worker: Failed to sync conversation updates', error)
  }
}

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received', event)

  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event)
  event.notification.close()

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})