import { ReactNode } from 'react'

interface ParsedContent {
  type: 'text' | 'code'
  content: string
  language?: string
}

export function parseMessageContent(content: string): ParsedContent[] {
  const parts: ParsedContent[] = []
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g

  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index)
      if (textContent.trim()) {
        parts.push({
          type: 'text',
          content: textContent
        })
      }
    }

    // Add the code block
    const language = match[1] || 'text'
    const code = match[2].trim()
    if (code) {
      parts.push({
        type: 'code',
        content: code,
        language
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after the last code block
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex)
    if (remainingText.trim()) {
      parts.push({
        type: 'text',
        content: remainingText
      })
    }
  }

  // If no code blocks found, return the entire content as text
  if (parts.length === 0) {
    return [{
      type: 'text',
      content
    }]
  }

  return parts
}