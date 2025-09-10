'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
// Dynamic import for analytics service to avoid SSR issues
const getAnalyticsService = async () => {
  if (typeof window === 'undefined') return null
  const { analyticsService } = await import('../lib/analyticsService')
  return analyticsService
}
import { organizationService } from '../lib/organizationService'
import type { Database } from '../types/database'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationMember = Database['public']['Tables']['organization_members']['Row']

interface OrganizationContext {
  organization: Organization | null
  member: OrganizationMember | null
  organizations: Organization[]
  memberships: (OrganizationMember & { organization: Organization })[]
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  organizationContext: OrganizationContext | null
  currentOrganization: Organization | null
  userOrganizations: Organization[]
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  refreshOrganizationContext: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [organizationContext, setOrganizationContext] = useState<OrganizationContext | null>(null)
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([])
  const [userMemberships, setUserMemberships] = useState<(OrganizationMember & { organization: Organization })[]>([])

  // Load organization context for authenticated user
  const loadOrganizationContext = async (user: User) => {
    try {
      const [orgContext, memberships] = await Promise.all([
        organizationService.getCurrentOrganizationContext(),
        organizationService.organizationMemberService.getUserMemberships()
      ])

      setUserMemberships(memberships)
      setUserOrganizations(memberships.map(m => m.organization))

      if (orgContext) {
        const currentOrg = memberships.find(m => m.organization_id === orgContext.organization_id)?.organization || null
        const currentMember = memberships.find(m => m.organization_id === orgContext.organization_id) || null

        setCurrentOrganization(currentOrg)
        setOrganizationContext({
          organization: currentOrg,
          member: currentMember,
          organizations: memberships.map(m => m.organization),
          memberships
        })
      } else {
        setCurrentOrganization(null)
        setOrganizationContext(null)
      }
    } catch (error) {
      console.error('Error loading organization context:', error)
      setCurrentOrganization(null)
      setOrganizationContext(null)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)

        // Load organization context if user is authenticated
        if (session?.user) {
          await loadOrganizationContext(session.user)
        }
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)

        setSession(session)
        setUser(session?.user ?? null)

        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in - track login event
          const analytics = await getAnalyticsService()
          if (analytics) {
            analytics.trackEvent('login', {
              method: 'email',
              user_agent: navigator.userAgent
            }, session.user.id)
            analytics.updateUserEngagement(session.user.id)
          }

          // Load organization context
          await loadOrganizationContext(session.user)
        } else if (event === 'SIGNED_OUT') {
          // User signed out - track logout event
          if (user?.id) {
            const analytics = await getAnalyticsService()
            if (analytics) {
              analytics.trackEvent('logout', {}, user.id)
            }
          }
          setUser(null)
          setSession(null)
          setCurrentOrganization(null)
          setOrganizationContext(null)
          setUserOrganizations([])
          setUserMemberships([])
        } else if (event === 'TOKEN_REFRESHED') {
          // Token was refreshed - refresh organization context if user exists
          if (session?.user) {
            await loadOrganizationContext(session.user)
          }
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      console.log('Sign in successful:', data.user?.email)
      // Don't set loading to false here - let the auth state change handler do it
    } catch (error) {
      console.error('Sign in error:', error)
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) throw error

      // Track signup event
      if (data.user) {
        const analytics = await getAnalyticsService()
        if (analytics) {
          analytics.trackEvent('signup', {
            method: 'email',
            user_agent: navigator.userAgent
          }, data.user.id)
        }
      }
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) throw error
  }

  const switchOrganization = async (organizationId: string) => {
    if (!user) throw new Error('User not authenticated')

    // Update user's default organization
    const { error } = await supabase
      .from('users')
      .update({ default_organization_id: organizationId })
      .eq('id', user.id)

    if (error) throw error

    // Reload organization context
    await loadOrganizationContext(user)
  }

  const refreshOrganizationContext = async () => {
    if (user) {
      await loadOrganizationContext(user)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    organizationContext,
    currentOrganization,
    userOrganizations,
    signIn,
    signUp,
    signOut,
    resetPassword,
    switchOrganization,
    refreshOrganizationContext
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}