import React, { useState } from 'react'
import { Copy, Play, Check } from 'lucide-react'

interface CodeExampleProps {
  title?: string
  description?: string
  code: string
  language?: string
  executable?: boolean
  onExecute?: () => Promise<string> | string
}

export const CodeExample: React.FC<CodeExampleProps> = ({
  title,
  description,
  code,
  language = 'typescript',
  executable = false,
  onExecute
}) => {
  const [copied, setCopied] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [output, setOutput] = useState('')

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExecute = async () => {
    if (!onExecute) return

    setExecuting(true)
    setOutput('')

    try {
      const result = await onExecute()
      setOutput(result)
    } catch (error: any) {
      setOutput(`Error: ${error.message}`)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {(title || description) && (
        <div className="px-4 py-3 border-b bg-gray-50">
          {title && <h4 className="font-medium text-gray-900">{title}</h4>}
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-200 text-sm">
          <span>{language}</span>
          <div className="flex gap-2">
            {executable && onExecute && (
              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {executing ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                {executing ? 'Running...' : 'Run'}
              </button>
            )}
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <pre className="p-4 bg-gray-900 text-green-400 overflow-x-auto text-sm">
          <code>{code}</code>
        </pre>
      </div>

      {output && (
        <div className="border-t">
          <div className="px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700">
            Output:
          </div>
          <pre className="p-4 bg-gray-900 text-yellow-400 text-sm overflow-x-auto">
            <code>{output}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

// Pre-configured examples
export const TypeScriptExample: React.FC<Omit<CodeExampleProps, 'language'>> = (props) => (
  <CodeExample {...props} language="typescript" />
)

export const JavaScriptExample: React.FC<Omit<CodeExampleProps, 'language'>> = (props) => (
  <CodeExample {...props} language="javascript" />
)

export const BashExample: React.FC<Omit<CodeExampleProps, 'language'>> = (props) => (
  <CodeExample {...props} language="bash" />
)

export const SQLExample: React.FC<Omit<CodeExampleProps, 'language'>> = (props) => (
  <CodeExample {...props} language="sql" />
)