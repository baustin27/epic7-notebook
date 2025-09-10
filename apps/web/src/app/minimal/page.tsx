'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function MinimalPage() {
  const [email, setEmail] = useState('baustin2786@gmail.com')
  const [password, setPassword] = useState('2A59cq!CC')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setResult('Attempting login...')
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setResult(`❌ Login failed: ${error.message}`)
      } else {
        setResult(`✅ Login successful! User: ${data.user?.email}`)
      }
    } catch (error: any) {
      setResult(`💥 Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Minimal Login Test</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Test Login'}
          </button>
          
          {result && (
            <div className={`p-3 rounded text-sm ${
              result.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}