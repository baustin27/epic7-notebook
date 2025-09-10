'use client'

import React, { useEffect, useRef } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'destructive' | 'warning' | 'info' | 'success'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
  onClose?: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  isLoading = false,
  onConfirm,
  onCancel,
  onClose
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Focus the confirm button for accessibility
      setTimeout(() => {
        confirmButtonRef.current?.focus()
      }, 100)
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel()
    }
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'destructive':
        return {
          icon: '⚠️',
          confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          titleColor: 'text-red-600'
        }
      case 'warning':
        return {
          icon: '⚠️',
          confirmButton: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
          titleColor: 'text-amber-600'
        }
      case 'success':
        return {
          icon: '✅',
          confirmButton: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          titleColor: 'text-green-600'
        }
      default:
        return {
          icon: 'ℹ️',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          titleColor: 'text-blue-600'
        }
    }
  }

  const styles = getTypeStyles()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-200 ease-out"
        style={{ animation: 'modal-enter 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center p-6 pb-4">
          <div className="text-2xl mr-3">{styles.icon}</div>
          <div className="flex-1">
            <h2
              id="confirm-dialog-title"
              className={`text-lg font-semibold ${styles.titleColor}`}
            >
              {title}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Message */}
        <div className="px-6 pb-4">
          <p id="confirm-dialog-message" className="text-gray-600">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center ${styles.confirmButton}`}
          >
            {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog