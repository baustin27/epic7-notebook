'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { organizationService } from '../../lib/organizationService'
import type { Database } from '../../types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

interface OrganizationSwitcherProps {
  className?: string
}

export function OrganizationSwitcher({ className = '' }: OrganizationSwitcherProps) {
  const { user, currentOrganization, userOrganizations, switchOrganization } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleOrganizationSwitch = async (organizationId: string) => {
    if (organizationId === currentOrganization?.id) {
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      await switchOrganization(organizationId)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to switch organization:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || !currentOrganization) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        disabled={isLoading}
      >
        <div className="flex items-center space-x-2">
          {currentOrganization.logo_url ? (
            <img
              src={currentOrganization.logo_url}
              alt={currentOrganization.name}
              className="w-6 h-6 rounded"
            />
          ) : (
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {currentOrganization.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="truncate max-w-32">{currentOrganization.name}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Your Organizations
            </div>

            {userOrganizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleOrganizationSwitch(org.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm hover:bg-gray-50 ${
                  org.id === currentOrganization.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
                disabled={isLoading}
              >
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt={org.name}
                    className="w-6 h-6 rounded"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium truncate">{org.name}</div>
                  {org.id === currentOrganization.id && (
                    <div className="text-xs text-blue-600">Current</div>
                  )}
                </div>
                {org.id === currentOrganization.id && (
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}

            <div className="border-t border-gray-200 mt-1 pt-1">
              <button
                onClick={() => {
                  // TODO: Open create organization modal
                  setIsOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span>Create Organization</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}