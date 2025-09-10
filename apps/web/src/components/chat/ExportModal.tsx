'use client'

import { useState, useEffect } from 'react'
import { messageService } from '../../lib/database'
import jsPDF from 'jspdf'

interface ExportModalProps {
  isOpen: boolean
  conversationId: string | null
  conversationTitle: string
  onClose: () => void
}

type ExportFormat = 'json' | 'markdown' | 'pdf'

export function ExportModal({ isOpen, conversationId, conversationTitle, onClose }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json')
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [exportProgress, setExportProgress] = useState<string>('')

  // Fetch message count when modal opens
  useEffect(() => {
    if (isOpen && conversationId) {
      const fetchMessageCount = async () => {
        try {
          const messages = await messageService.getByConversationId(conversationId)
          setMessageCount(messages.length)
        } catch (err) {
          console.error('Failed to fetch message count:', err)
          setMessageCount(0)
        }
      }
      fetchMessageCount()
    }
  }, [isOpen, conversationId])

  if (!isOpen || !conversationId) return null

  const handleExport = async () => {
    if (!conversationId) return

    setIsExporting(true)
    setError(null)
    setExportProgress('Fetching messages...')

    try {
      // Fetch conversation messages
      const messages = await messageService.getByConversationId(conversationId)
      setExportProgress(`Processing ${messages.length} messages...`)

      // Generate export data based on format
      let content: string
      let filename: string
      let mimeType: string

      switch (selectedFormat) {
        case 'json':
          setExportProgress('Generating JSON export...')
          content = JSON.stringify({
            conversation: {
              id: conversationId,
              title: conversationTitle,
              exportedAt: new Date().toISOString(),
              messageCount: messages.length
            },
            messages: messages.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.created_at,
              metadata: msg.metadata
            }))
          }, null, 2)
          filename = `${conversationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`
          mimeType = 'application/json'
          break

        case 'markdown':
          setExportProgress('Generating Markdown export...')
          content = generateMarkdownExport(conversationTitle, messages)
          filename = `${conversationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.md`
          mimeType = 'text/markdown'
          break

        case 'pdf':
          setExportProgress('Generating PDF export...')
          const pdf = new jsPDF()
          generatePDFExport(pdf, conversationTitle, messages)
          setExportProgress('Saving PDF file...')
          pdf.save(`${conversationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.pdf`)
          onClose()
          return // Early return since PDF is handled differently

        default:
          throw new Error('Invalid export format')
      }

      // Create and download file
      setExportProgress('Preparing download...')
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportProgress('Export completed!')
      setTimeout(() => onClose(), 1000) // Brief delay to show completion
    } catch (err) {
      console.error('Export failed:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
      setExportProgress('')
    }
  }

  const generateMarkdownExport = (title: string, messages: any[]): string => {
    let markdown = `# ${title}\n\n`
    markdown += `*Exported on ${new Date().toLocaleString()}*\n\n`
    markdown += `---\n\n`

    messages.forEach((message, index) => {
      const timestamp = new Date(message.created_at).toLocaleString()
      const role = message.role === 'user' ? '👤 User' : message.role === 'assistant' ? '🤖 Assistant' : '⚙️ System'

      markdown += `## ${role} (${timestamp})\n\n`
      markdown += `${message.content}\n\n`

      if (index < messages.length - 1) {
        markdown += `---\n\n`
      }
    })

    return markdown
  }

  const generatePDFExport = (pdf: jsPDF, title: string, messages: any[]) => {
    const pageHeight = pdf.internal.pageSize.height
    let yPosition = 20

    // Title
    pdf.setFontSize(18)
    pdf.text(title, 20, yPosition)
    yPosition += 15

    // Export date
    pdf.setFontSize(10)
    pdf.setTextColor(100)
    pdf.text(`Exported on ${new Date().toLocaleString()}`, 20, yPosition)
    yPosition += 10

    // Line separator
    pdf.setDrawColor(200)
    pdf.line(20, yPosition, pdf.internal.pageSize.width - 20, yPosition)
    yPosition += 15

    messages.forEach((message) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        pdf.addPage()
        yPosition = 20
      }

      const timestamp = new Date(message.created_at).toLocaleString()
      const role = message.role === 'user' ? '👤 User' : message.role === 'assistant' ? '🤖 Assistant' : '⚙️ System'

      // Role and timestamp
      pdf.setFontSize(12)
      const color = message.role === 'user' ? [0, 123, 255] : message.role === 'assistant' ? [40, 167, 69] : [108, 117, 125]
      pdf.setTextColor(color[0], color[1], color[2])
      pdf.text(`${role} (${timestamp})`, 20, yPosition)
      yPosition += 8

      // Message content
      pdf.setFontSize(10)
      pdf.setTextColor(0)
      const lines = pdf.splitTextToSize(message.content, pdf.internal.pageSize.width - 40)

      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        pdf.text(line, 20, yPosition)
        yPosition += 5
      })

      yPosition += 10 // Space between messages
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Export Conversation
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Export "{conversationTitle}" in the following format:
        </p>

        {messageCount > 100 && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-700 dark:text-yellow-200 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Large Conversation Warning</span>
            </div>
            <p className="text-sm mt-1">
              This conversation contains {messageCount} messages. Exporting may take some time and use significant memory.
            </p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <label className="flex items-center">
            <input
              type="radio"
              value="json"
              checked={selectedFormat === 'json'}
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
              className="mr-3"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">JSON</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">Complete data with metadata</p>
            </div>
          </label>

          <label className="flex items-center">
            <input
              type="radio"
              value="markdown"
              checked={selectedFormat === 'markdown'}
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
              className="mr-3"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Markdown</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">Readable text format</p>
            </div>
          </label>

          <label className="flex items-center">
            <input
              type="radio"
              value="pdf"
              checked={selectedFormat === 'pdf'}
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
              className="mr-3"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">PDF</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">Professional document format</p>
            </div>
          </label>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 rounded">
            {error}
          </div>
        )}

        {isExporting && exportProgress && (
          <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 border border-blue-400 text-blue-700 dark:text-blue-200 rounded">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              {exportProgress}
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}