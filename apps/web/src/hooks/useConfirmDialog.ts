'use client'

import { useState, useCallback } from 'react'

interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'destructive' | 'warning' | 'info' | 'success'
  onConfirm?: () => void
  onCancel?: () => void
}

export const useConfirmDialog = () => {
  const [dialog, setDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const confirm = useCallback((
    options: Omit<ConfirmDialogState, 'isOpen' | 'onConfirm' | 'onCancel'>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        ...options,
        isOpen: true,
        onConfirm: () => {
          resolve(true)
          setDialog(prev => ({ ...prev, isOpen: false }))
        },
        onCancel: () => {
          resolve(false)
          setDialog(prev => ({ ...prev, isOpen: false }))
        }
      })
    })
  }, [])

  const closeDialog = useCallback(() => {
    setDialog(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Pre-configured confirmation methods
  const confirmDelete = useCallback((itemName: string, itemType = 'item') => {
    return confirm({
      title: 'Delete Confirmation',
      message: `Are you sure you want to delete this ${itemType}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'destructive'
    })
  }, [confirm])

  const confirmClear = useCallback((target = 'all data') => {
    return confirm({
      title: 'Clear Confirmation',
      message: `Are you sure you want to clear ${target}? This action cannot be undone.`,
      confirmText: 'Clear',
      cancelText: 'Cancel',
      type: 'warning'
    })
  }, [confirm])

  const confirmExport = useCallback((format: string) => {
    return confirm({
      title: 'Export Data',
      message: `This will export your data in ${format} format. Do you want to proceed?`,
      confirmText: 'Export',
      cancelText: 'Cancel',
      type: 'info'
    })
  }, [confirm])

  const confirmSave = useCallback((hasUnsavedChanges = true) => {
    if (!hasUnsavedChanges) return Promise.resolve(true)

    return confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Do you want to save them before proceeding?',
      confirmText: 'Save Changes',
      cancelText: 'Discard',
      type: 'warning'
    })
  }, [confirm])

  const confirmNavigation = useCallback((destination: string) => {
    return confirm({
      title: 'Navigate Away',
      message: `Are you sure you want to navigate to ${destination}? Any unsaved changes will be lost.`,
      confirmText: 'Navigate',
      cancelText: 'Stay',
      type: 'warning'
    })
  }, [confirm])

  return {
    dialog,
    confirm,
    closeDialog,
    // Pre-configured methods
    confirmDelete,
    confirmClear,
    confirmExport,
    confirmSave,
    confirmNavigation
  }
}

export default useConfirmDialog