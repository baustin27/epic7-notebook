'use client'

import { LoginForm } from '../components/auth/LoginForm'
import { useAuth } from '../contexts/SimpleAuthContext'
import { ChatInterface } from '../components/ChatInterface'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoginForm />
      </div>
    )
  }

  return (
    <main className="h-screen flex flex-col">
      <ChatInterface />
    </main>
  )
}