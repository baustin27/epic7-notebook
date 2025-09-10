'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface ProfessionalTheme {
  mode: 'standard' | 'professional' | 'presentation'
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  borderColor: string
  fontFamily: string
  borderRadius: string
  shadow: string
}

const defaultThemes: Record<string, ProfessionalTheme> = {
  standard: {
    mode: 'standard',
    primaryColor: '#3B82F6',
    secondaryColor: '#6B7280',
    accentColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#111827',
    borderColor: '#E5E7EB',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '0.5rem',
    shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
  },
  professional: {
    mode: 'professional',
    primaryColor: '#1F2937',
    secondaryColor: '#4B5563',
    accentColor: '#059669',
    backgroundColor: '#F9FAFB',
    textColor: '#111827',
    borderColor: '#D1D5DB',
    fontFamily: 'Georgia, serif',
    borderRadius: '0.25rem',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  },
  presentation: {
    mode: 'presentation',
    primaryColor: '#1E40AF',
    secondaryColor: '#374151',
    accentColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    borderColor: '#9CA3AF',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '0.75rem',
    shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  }
}

interface ProfessionalThemeContextType {
  theme: ProfessionalTheme
  setTheme: (theme: keyof typeof defaultThemes | ProfessionalTheme) => void
  isProfessionalMode: boolean
  isPresentationMode: boolean
}

const ProfessionalThemeContext = createContext<ProfessionalThemeContextType | undefined>(undefined)

export const useProfessionalTheme = () => {
  const context = useContext(ProfessionalThemeContext)
  if (!context) {
    throw new Error('useProfessionalTheme must be used within a ProfessionalThemeProvider')
  }
  return context
}

interface ProfessionalThemeProviderProps {
  children: React.ReactNode
  initialTheme?: keyof typeof defaultThemes
}

export const ProfessionalThemeProvider: React.FC<ProfessionalThemeProviderProps> = ({
  children,
  initialTheme = 'standard'
}) => {
  const [theme, setThemeState] = useState<ProfessionalTheme>(defaultThemes[initialTheme])

  useEffect(() => {
    // Load theme from localStorage
    const stored = localStorage.getItem('professionalTheme')
    if (stored) {
      try {
        const parsedTheme = JSON.parse(stored)
        if (defaultThemes[parsedTheme] || parsedTheme.mode) {
          setThemeState(defaultThemes[parsedTheme] || parsedTheme)
        }
      } catch (error) {
        console.error('Failed to parse stored theme:', error)
      }
    }
  }, [])

  const setTheme = (newTheme: keyof typeof defaultThemes | ProfessionalTheme) => {
    const themeToSet = typeof newTheme === 'string' ? defaultThemes[newTheme] : newTheme
    setThemeState(themeToSet)
    localStorage.setItem('professionalTheme', JSON.stringify(newTheme))
  }

  const value: ProfessionalThemeContextType = {
    theme,
    setTheme,
    isProfessionalMode: theme.mode === 'professional',
    isPresentationMode: theme.mode === 'presentation'
  }

  return (
    <ProfessionalThemeContext.Provider value={value}>
      <div
        className="min-h-screen"
        style={{
          fontFamily: theme.fontFamily,
          backgroundColor: theme.backgroundColor,
          color: theme.textColor
        }}
      >
        {children}
      </div>
    </ProfessionalThemeContext.Provider>
  )
}

// Confidence indicator component
interface ConfidenceIndicatorProps {
  confidence: number // 0-100
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  className?: string
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  label = 'Confidence',
  size = 'md',
  showPercentage = true,
  className = ''
}) => {
  const { theme } = useProfessionalTheme()

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return '#10B981' // green
    if (conf >= 70) return '#3B82F6' // blue
    if (conf >= 50) return '#F59E0B' // amber
    return '#EF4444' // red
  }

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 90) return 'Very High'
    if (conf >= 70) return 'High'
    if (conf >= 50) return 'Medium'
    return 'Low'
  }

  const sizeClasses = {
    sm: 'w-16 h-2',
    md: 'w-24 h-3',
    lg: 'w-32 h-4'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500">
              {confidence}% - {getConfidenceLabel(confidence)}
            </span>
          )}
        </div>
        <div className={`bg-gray-200 rounded-full ${sizeClasses[size]}`}>
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${confidence}%`,
              backgroundColor: getConfidenceColor(confidence)
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Session reliability indicator
interface SessionReliabilityProps {
  status: 'online' | 'connecting' | 'offline' | 'error'
  uptime?: number // minutes
  lastError?: string
  className?: string
}

export const SessionReliability: React.FC<SessionReliabilityProps> = ({
  status,
  uptime,
  lastError,
  className = ''
}) => {
  const { theme } = useProfessionalTheme()

  const getStatusInfo = () => {
    switch (status) {
      case 'online':
        return {
          color: '#10B981',
          icon: '🟢',
          label: 'Online',
          description: uptime ? `Uptime: ${Math.floor(uptime / 60)}h ${uptime % 60}m` : 'Connected'
        }
      case 'connecting':
        return {
          color: '#F59E0B',
          icon: '🟡',
          label: 'Connecting',
          description: 'Reestablishing connection...'
        }
      case 'offline':
        return {
          color: '#EF4444',
          icon: '🔴',
          label: 'Offline',
          description: 'Connection lost'
        }
      case 'error':
        return {
          color: '#EF4444',
          icon: '❌',
          label: 'Error',
          description: lastError || 'Connection error'
        }
      default:
        return {
          color: '#6B7280',
          icon: '⚪',
          label: 'Unknown',
          description: 'Status unknown'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className={`flex items-center space-x-3 p-3 bg-white border rounded-lg shadow-sm ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{statusInfo.icon}</span>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">{statusInfo.label}</span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusInfo.color }}
            />
          </div>
          <p className="text-xs text-gray-600">{statusInfo.description}</p>
        </div>
      </div>
    </div>
  )
}

// Professional button component
interface ProfessionalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export const ProfessionalButton: React.FC<ProfessionalButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const { theme } = useProfessionalTheme()

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    primary: `bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 ${theme.shadow}`,
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-blue-500'
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || loading}
      style={{
        borderRadius: theme.borderRadius,
        fontFamily: theme.fontFamily
      }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
}

// Professional card component
interface ProfessionalCardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  shadow?: boolean
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({
  children,
  title,
  subtitle,
  className = '',
  padding = 'md',
  shadow = true
}) => {
  const { theme } = useProfessionalTheme()

  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div
      className={`bg-white border rounded-lg ${shadow ? theme.shadow : ''} ${className}`}
      style={{
        borderColor: theme.borderColor,
        borderRadius: theme.borderRadius
      }}
    >
      {(title || subtitle) && (
        <div className="border-b border-gray-200 pb-4 mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: theme.fontFamily }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </div>
  )
}

export default ProfessionalThemeProvider