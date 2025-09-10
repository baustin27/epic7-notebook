'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  lines?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'

  const variantClasses = {
    text: 'h-4',
    rectangular: 'h-4',
    circular: 'rounded-full'
  }

  const getWidth = () => {
    if (typeof width === 'number') return `${width}px`
    if (typeof width === 'string') return width
    return variant === 'text' ? '100%' : 'auto'
  }

  const getHeight = () => {
    if (typeof height === 'number') return `${height}px`
    if (typeof height === 'string') return height
    return variant === 'circular' ? getWidth() : 'auto'
  }

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              width: getWidth(),
              height: getHeight()
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        width: getWidth(),
        height: getHeight()
      }}
    />
  )
}

// Message skeleton for chat
export const MessageSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="flex space-x-4 p-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton variant="text" width="75%" />
          <Skeleton variant="text" width="50%" />
        </div>
      </div>
    </div>
  )
}

// Conversation list skeleton
export const ConversationSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="flex-1 space-y-1">
            <Skeleton variant="text" width="80%" height={16} />
            <Skeleton variant="text" width="60%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Card skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="space-y-3">
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="rectangular" width="100%" height={120} />
        <div className="flex space-x-2">
          <Skeleton variant="rectangular" width={80} height={32} />
          <Skeleton variant="rectangular" width={60} height={32} />
        </div>
      </div>
    </div>
  )
}

// Table skeleton
export const TableSkeleton: React.FC<{
  rows?: number
  columns?: number
  className?: string
}> = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {/* Header */}
      <div className="flex space-x-4 mb-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} variant="text" width={120} height={16} />
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} variant="text" width={120} height={14} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Skeleton