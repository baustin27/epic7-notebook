'use client'

import React from 'react'

interface ProgressBarProps {
  progress: number // 0-100
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'orange' | 'red'
  showPercentage?: boolean
  label?: string
  animated?: boolean
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  size = 'md',
  color = 'blue',
  showPercentage = false,
  label,
  animated = true
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600'
  }

  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500">{clampedProgress}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300 ease-out ${
            animated ? 'transition-all' : ''
          }`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

// File upload progress with additional info
interface FileUploadProgressProps extends Omit<ProgressBarProps, 'progress'> {
  fileName: string
  fileSize: number
  uploadedBytes: number
  speed?: number // bytes per second
  timeRemaining?: number // seconds
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  fileName,
  fileSize,
  uploadedBytes,
  speed,
  timeRemaining,
  ...progressProps
}) => {
  const progress = (uploadedBytes / fileSize) * 100

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-900 truncate" title={fileName}>
          {fileName}
        </span>
        <span className="text-sm text-gray-500">
          {formatFileSize(uploadedBytes)} / {formatFileSize(fileSize)}
        </span>
      </div>

      <ProgressBar progress={progress} {...progressProps} />

      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{Math.round(progress)}% complete</span>
        <div className="flex space-x-2">
          {speed && <span>{formatFileSize(speed)}/s</span>}
          {timeRemaining && <span>{formatTime(timeRemaining)} left</span>}
        </div>
      </div>
    </div>
  )
}

// Circular progress indicator
interface CircularProgressProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  showPercentage?: boolean
  className?: string
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 40,
  strokeWidth = 4,
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  showPercentage = false,
  className = ''
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {showPercentage && (
        <span className="absolute text-xs font-medium text-gray-700">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  )
}

export default ProgressBar