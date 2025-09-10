import React, { useState } from 'react'
import { Copy, Play, RotateCcw } from 'lucide-react'

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  body?: object
}

interface ApiPlaygroundProps {
  endpoints: ApiEndpoint[]
  baseUrl?: string
}

export const ApiPlayground: React.FC<ApiPlaygroundProps> = ({
  endpoints,
  baseUrl = '/api'
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoints[0])
  const [requestBody, setRequestBody] = useState(
    selectedEndpoint.body ? JSON.stringify(selectedEndpoint.body, null, 2) : ''
  )
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [headers, setHeaders] = useState('')

  const handleEndpointChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const endpointIndex = parseInt(event.target.value)
    const endpoint = endpoints[endpointIndex]
    setSelectedEndpoint(endpoint)
    setRequestBody(endpoint.body ? JSON.stringify(endpoint.body, null, 2) : '')
    setResponse('')
  }

  const handleExecute = async () => {
    setLoading(true)
    setResponse('')

    try {
      const url = `${baseUrl}${selectedEndpoint.path}`

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...JSON.parse(headers || '{}')
        }
      }

      if (selectedEndpoint.method !== 'GET' && requestBody) {
        options.body = requestBody
      }

      const res = await fetch(url, options)
      const data = await res.text()

      const formattedResponse = JSON.stringify({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: data ? JSON.parse(data) : null
      }, null, 2)

      setResponse(formattedResponse)
    } catch (error: any) {
      setResponse(JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }, null, 2))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800'
      case 'POST': return 'bg-blue-100 text-blue-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">API Playground</h3>
        </div>
        <p className="text-gray-600 mb-6">
          Test API endpoints directly from the documentation
        </p>

        <div className="space-y-4">
          {/* Endpoint Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Endpoint</label>
            <select
              onChange={handleEndpointChange}
              className="w-full p-2 border rounded-md bg-white"
            >
              {endpoints.map((endpoint, index) => (
                <option key={index} value={index}>
                  {endpoint.method} {endpoint.path}
                </option>
              ))}
            </select>
          </div>

          {/* Current Endpoint Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(selectedEndpoint.method)}`}>
                {selectedEndpoint.method}
              </span>
              <code className="text-sm bg-gray-200 px-2 py-1 rounded">
                {baseUrl}{selectedEndpoint.path}
              </code>
            </div>
            <p className="text-sm text-gray-600">{selectedEndpoint.description}</p>
          </div>

          {/* Headers */}
          <div>
            <label className="block text-sm font-medium mb-2">Headers (JSON)</label>
            <textarea
              placeholder='{"Authorization": "Bearer your-token"}'
              value={headers}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHeaders(e.target.value)}
              rows={3}
              className="w-full p-2 border rounded-md font-mono text-sm"
            />
          </div>

          {/* Request Body */}
          {selectedEndpoint.method !== 'GET' && (
            <div>
              <label className="block text-sm font-medium mb-2">Request Body (JSON)</label>
              <textarea
                placeholder="{}"
                value={requestBody}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRequestBody(e.target.value)}
                rows={6}
                className="w-full p-2 border rounded-md font-mono text-sm"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExecute}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {loading ? 'Executing...' : 'Execute'}
            </button>
            <button
              onClick={() => setResponse('')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Response */}
      {response && (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Response</h3>
            <button
              onClick={() => copyToClipboard(response)}
              className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
            {response}
          </pre>
        </div>
      )}
    </div>
  )
}