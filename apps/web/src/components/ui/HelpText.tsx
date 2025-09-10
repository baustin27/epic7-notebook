'use client'

import React, { useState } from 'react'
import { Tooltip } from './Tooltip'

interface HelpTextProps {
  text: string
  tooltip?: string
  icon?: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  compact?: boolean
}

export const HelpText: React.FC<HelpTextProps> = ({
  text,
  tooltip,
  icon,
  position = 'top',
  className = '',
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const defaultIcon = (
    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  )

  if (compact) {
    return (
      <Tooltip content={text} position={position}>
        <button
          type="button"
          className={`inline-flex items-center justify-center ${className}`}
          aria-label="Help"
        >
          {icon || defaultIcon}
        </button>
      </Tooltip>
    )
  }

  return (
    <div className={`flex items-start space-x-2 ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        {icon || defaultIcon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
        {tooltip && (
          <Tooltip content={tooltip} position={position}>
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-800 underline ml-1"
              aria-label="More information"
            >
              Learn more
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

// Expandable help text for complex features
interface ExpandableHelpTextProps extends HelpTextProps {
  expandedText?: string
  showExpandedByDefault?: boolean
}

export const ExpandableHelpText: React.FC<ExpandableHelpTextProps> = ({
  text,
  expandedText,
  showExpandedByDefault = false,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(showExpandedByDefault)

  if (!expandedText) {
    return <HelpText text={text} {...props} />
  }

  return (
    <div className={props.className}>
      <HelpText
        {...props}
        text={isExpanded ? expandedText : text}
      />
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
        aria-expanded={isExpanded}
        aria-controls="help-expanded-content"
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  )
}

// Field-level help text
interface FieldHelpTextProps {
  error?: string
  help?: string
  success?: string
  className?: string
}

export const FieldHelpText: React.FC<FieldHelpTextProps> = ({
  error,
  help,
  success,
  className = ''
}) => {
  if (error) {
    return (
      <p className={`text-sm text-red-600 mt-1 ${className}`} role="alert">
        {error}
      </p>
    )
  }

  if (success) {
    return (
      <p className={`text-sm text-green-600 mt-1 ${className}`}>
        {success}
      </p>
    )
  }

  if (help) {
    return (
      <p className={`text-sm text-gray-500 mt-1 ${className}`}>
        {help}
      </p>
    )
  }

  return null
}

// Inline help for form fields
interface InlineFieldHelpProps {
  label: string
  helpText: string
  required?: boolean
  tooltip?: string
  className?: string
}

export const InlineFieldHelp: React.FC<InlineFieldHelpProps> = ({
  label,
  helpText,
  required = false,
  tooltip,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Tooltip content={helpText} position="top">
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600"
          aria-label={`Help for ${label}`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </button>
      </Tooltip>
      {tooltip && (
        <Tooltip content={tooltip} position="top">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600"
            aria-label={`Additional information for ${label}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
        </Tooltip>
      )}
    </div>
  )
}

export default HelpText