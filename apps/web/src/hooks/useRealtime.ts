import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import { useOfflineStorage } from './useOfflineStorage'

type Tables = Database['public']['Tables']
type Conversation = Tables['conversations']['Row']
type Message = Tables['messages']['Row']

// Hook for real-time conversation updates
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isOnline, storeConversation, getOfflineConversations } = useOfflineStorage()

  useEffect(() => {
    // Initial fetch with offline support
    const fetchConversations = async () => {
      try {
        if (isOnline) {
          // Fetch from Supabase
          const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .order('updated_at', { ascending: false })

          if (error) throw error

          const conversationsData = data || []
          setConversations(conversationsData)

          // Store in offline storage for future use
          for (const conv of conversationsData) {
            await storeConversation(conv)
          }
        } else {
          // Load from offline storage
          const offlineConversations = await getOfflineConversations()
          setConversations(offlineConversations)
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err)

        // Fallback to offline storage if online fetch fails
        if (isOnline) {
          try {
            const offlineConversations = await getOfflineConversations()
            setConversations(offlineConversations)
            setError('Using offline data - connection issue')
          } catch (offlineErr) {
            setError(err instanceof Error ? err.message : 'Failed to fetch conversations')
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch conversations')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Conversation change:', payload)

          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new as Conversation, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(conv =>
                conv.id === payload.new.id ? payload.new as Conversation : conv
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev =>
              prev.filter(conv => conv.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { conversations, loading, error }
}

// Hook for real-time messages in a conversation
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const maxRetries = 5
  const baseDelay = 1000 // 1 second

  const { isOnline, storeMessage, getOfflineMessages } = useOfflineStorage()

  // Exponential backoff delay calculation
  const getRetryDelay = useCallback((attempt: number) => {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000) // Max 30 seconds
  }, [])

  // Setup real-time subscription with retry logic
  const setupSubscription = useCallback((convId: string) => {
    if (channelRef.current && channelRef.current.state === 'SUBSCRIBED') {
      return // Already subscribed, don't re-setup
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`messages-${convId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          console.log('📨 Message real-time change:', payload.eventType, 'for conversation:', convId)

          if (payload.eventType === 'INSERT') {
            console.log('➕ Adding new message to UI')
            setMessages(prev => [...prev, payload.new as Message])
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ Updating existing message in UI')
            setMessages(prev =>
              prev.map(msg =>
                msg.id === payload.new.id ? payload.new as Message : msg
              )
            )
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Removing message from UI')
            setMessages(prev =>
              prev.filter(msg => msg.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)

        if (status === 'SUBSCRIBED') {
          setRetryCount(0)
          setError(null)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (retryCount < maxRetries) {
            const delay = getRetryDelay(retryCount)
            console.log(`🔄 Retrying connection in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)

            reconnectTimeoutRef.current = setTimeout(() => {
              setRetryCount(prev => prev + 1)
              setupSubscription(convId)
            }, delay)
          } else {
            setError('Real-time connection failed after maximum retries')
          }
        }
      })

    channelRef.current = channel
  }, [retryCount, getRetryDelay])

  // Background sync for offline-to-online transitions
  const performBackgroundSync = useCallback(async (convId: string) => {
    if (!isOnline) return

    try {
      console.log('🔄 Performing background sync for conversation:', convId)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Update messages if there are differences
      setMessages(currentMessages => {
        if (currentMessages.length !== (data?.length || 0)) {
          console.log('✅ Background sync updated messages')
          return data || []
        }
        return currentMessages
      })
    } catch (err) {
      console.error('❌ Background sync failed:', err)
    }
  }, [isOnline])

  // Function to manually refresh messages (fallback when real-time isn't working)
  const refreshMessages = async (convId: string) => {
    try {
      console.log('🔄 Manually refreshing messages for conversation:', convId)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      if (error) throw error
      console.log('✅ Messages manually refreshed:', data?.length || 0, 'messages')
      setMessages(data || [])
    } catch (err) {
      console.error('❌ Failed to manually refresh messages:', err)
    }
  }

  useEffect(() => {
    console.log('🔄 useMessages hook called with conversationId:', conversationId)
    
    if (!conversationId) {
      console.log('❌ No conversationId provided, clearing messages')
      setMessages([])
      setLoading(false)
      return
    }

    console.log('📡 Setting up message subscription for conversation:', conversationId)

    // Initial fetch with offline support
    const fetchMessages = async () => {
      try {
        console.log('📚 Fetching messages for conversation:', conversationId)

        if (isOnline) {
          // Fetch from Supabase
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

          if (error) throw error

          const messagesData = data || []
          console.log('✅ Messages fetched:', messagesData.length, 'messages')
          setMessages(messagesData)

          // Store in offline storage for future use
          for (const msg of messagesData) {
            await storeMessage(msg)
          }
        } else {
          // Load from offline storage
          const offlineMessages = await getOfflineMessages(conversationId)
          console.log('✅ Offline messages loaded:', offlineMessages.length, 'messages')
          setMessages(offlineMessages)
        }
      } catch (err) {
        console.error('❌ Failed to fetch messages:', err)

        // Fallback to offline storage if online fetch fails
        if (isOnline) {
          try {
            const offlineMessages = await getOfflineMessages(conversationId)
            setMessages(offlineMessages)
            setError('Using offline data - connection issue')
          } catch (offlineErr) {
            setError(err instanceof Error ? err.message : 'Failed to fetch messages')
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch messages')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Setup real-time subscription with retry logic only if not already set up
    if (!channelRef.current || channelRef.current.state !== 'SUBSCRIBED') {
      setupSubscription(conversationId)
    }

    // Listen for online/offline events for background sync
    const handleOnline = () => {
      console.log('🌐 Connection restored, performing background sync')
      performBackgroundSync(conversationId)
    }

    const handleOffline = () => {
      console.log('📴 Connection lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [conversationId, isOnline]) // Added isOnline to dependency to handle offline changes

  // Function to edit a message
  const editMessage = async (messageId: string, newContent: string, userId: string) => {
    try {
      // First verify the message belongs to the user by checking conversation ownership
      const { data: messageData, error: fetchError } = await supabase
        .from('messages')
        .select('conversation_id, content')
        .eq('id', messageId)
        .single()

      if (fetchError) throw fetchError

      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', messageData.conversation_id)
        .single()

      if (convError) throw convError

      if (conversationData.user_id !== userId) {
        throw new Error('Unauthorized: You can only edit your own messages')
      }

      // Optimistic update
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: newContent, updated_at: new Date().toISOString() }
            : msg
        )
      )

      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)

      if (error) {
        // Rollback on error
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, content: messageData.content || msg.content, updated_at: msg.updated_at }
              : msg
          )
        )
        throw error
      }
    } catch (err) {
      console.error('Failed to edit message:', err)
      throw err
    }
  }

  // Function to delete a message
  const deleteMessage = async (messageId: string, userId: string) => {
    try {
      // First verify the message belongs to the user by checking conversation ownership
      const { data: messageData, error: fetchError } = await supabase
        .from('messages')
        .select('conversation_id, content')
        .eq('id', messageId)
        .single()

      if (fetchError) throw fetchError

      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', messageData.conversation_id)
        .single()

      if (convError) throw convError

      if (conversationData.user_id !== userId) {
        throw new Error('Unauthorized: You can only delete your own messages')
      }

      // Optimistic update
      const deletedMessage = messages.find(msg => msg.id === messageId)
      setMessages(prev => prev.filter(msg => msg.id !== messageId))

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (error) {
        // Rollback on error
        if (deletedMessage) {
          setMessages(prev => [...prev, deletedMessage])
        }
        throw error
      }
    } catch (err) {
      console.error('Failed to delete message:', err)
      throw err
    }
  }

  // Expose refresh function for manual updates
  const refresh = conversationId ? () => refreshMessages(conversationId) : () => Promise.resolve()

  return {
    messages,
    loading,
    error,
    isOnline,
    refresh,
    editMessage,
    deleteMessage,
    retryCount
  }
}

// Hook for real-time user settings
export function useUserSettings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initial fetch
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .single()

        if (error && error.code !== 'PGRST116') throw error
        setSettings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch settings')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('user-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings'
        },
        (payload) => {
          console.log('Settings change:', payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSettings(payload.new)
          } else if (payload.eventType === 'DELETE') {
            setSettings(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { settings, loading, error }
}

// Hook for typing indicators (can be extended for real-time typing status)
export function useTypingIndicator(conversationId: string | null) {
  const [isTyping, setIsTyping] = useState(false)

  const startTyping = () => {
    setIsTyping(true)
    // Could broadcast typing status to other users here
  }

  const stopTyping = () => {
    setIsTyping(false)
    // Could broadcast typing stopped status here
  }

  return { isTyping, startTyping, stopTyping }
}

// Hook for connection status
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [lastConnected, setLastConnected] = useState<Date>(new Date())

  useEffect(() => {
    const channel = supabase.channel('connection-status')

    channel
      .on('broadcast', { event: 'status' }, ({ payload }) => {
        setIsConnected(payload.online)
        if (payload.online) {
          setLastConnected(new Date())
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setLastConnected(new Date())
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { isConnected, lastConnected }
}