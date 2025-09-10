import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { AuthProvider } from '../src/contexts/SimpleAuthContext'

// Custom render function that includes providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock implementations for common test scenarios
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString()
}

export const mockAuthContext = {
  user: mockUser,
  session: {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    user: mockUser
  },
  loading: false,
  organizationContext: null,
  currentOrganization: null,
  userOrganizations: [],
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  switchOrganization: jest.fn(),
  refreshOrganizationContext: jest.fn()
}

// Test data factories
export const createMockConversation = (overrides = {}) => ({
  id: 'conv-1',
  title: 'Test Conversation',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: mockUser.id,
  ...overrides
})

export const createMockMessage = (overrides = {}) => ({
  id: 'msg-1',
  content: 'Test message content',
  role: 'user',
  conversation_id: 'conv-1',
  created_at: new Date().toISOString(),
  ...overrides
})

// Common test helpers
export const waitForLoadingToFinish = async () => {
  // Wait for any loading states to finish
  await new Promise(resolve => setTimeout(resolve, 0))
}

export const mockApiResponse = (data: any, status = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  }
}

export const mockApiError = (message: string, status = 500) => {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new Error(message)),
    text: () => Promise.reject(new Error(message))
  }
}

// Local storage helpers for tests
export const setupLocalStorage = () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  })

  return localStorageMock
}

export const setupSessionStorage = () => {
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
  })

  return sessionStorageMock
}

// Performance testing helpers
export const measureRenderTime = async (component: ReactElement) => {
  const startTime = performance.now()

  customRender(component)

  const endTime = performance.now()
  return endTime - startTime
}

// Accessibility testing helpers
export const expectToBeAccessible = async (container: HTMLElement) => {
  const { axe, toHaveNoViolations } = await import('jest-axe')
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}

// Form testing helpers
export const fillFormField = async (fieldName: string, value: string) => {
  const field = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement
  if (field) {
    field.value = value
    field.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

export const submitForm = async (formSelector = 'form') => {
  const form = document.querySelector(formSelector) as HTMLFormElement
  if (form) {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }
}

// Export custom render as default
export { customRender as render }

// Re-export everything from testing-library
export * from '@testing-library/react'
export * from '@testing-library/jest-dom'