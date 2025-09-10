# Testing Guide

This comprehensive testing guide covers all aspects of testing for the AI Chat application, including unit tests, integration tests, E2E tests, performance tests, and accessibility tests.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Structure](#test-structure)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Performance Testing](#performance-testing)
7. [Accessibility Testing](#accessibility-testing)
8. [CI/CD Integration](#cicd-integration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Testing Overview

Our testing strategy follows a comprehensive approach with multiple layers:

- **Unit Tests**: Test individual functions, hooks, and components in isolation
- **Integration Tests**: Test component interactions and API integrations
- **E2E Tests**: Test complete user workflows from browser to backend
- **Performance Tests**: Monitor Core Web Vitals and bundle size
- **Accessibility Tests**: Ensure WCAG compliance and screen reader compatibility

### Test Coverage Goals

- **Unit Tests**: >90% coverage for components, hooks, and utilities
- **E2E Tests**: Cover all critical user journeys
- **Performance**: Core Web Vitals scores >80
- **Accessibility**: WCAG 2.1 AA compliance

## Test Structure

```
apps/web/
├── src/
│   ├── components/
│   │   ├── __tests__/          # Unit tests for components
│   │   └── *.test.tsx
│   ├── hooks/
│   │   └── __tests__/          # Unit tests for hooks
│   ├── lib/
│   │   └── __tests__/          # Unit tests for utilities
│   └── ...
├── tests/
│   ├── test-utils.ts           # Shared test utilities
│   ├── e2e/                    # E2E tests
│   │   ├── global-setup.ts
│   │   ├── global-teardown.ts
│   │   └── *.spec.ts
│   └── ...
├── jest.config.js              # Jest configuration
├── playwright.config.ts        # Playwright configuration
├── lighthouserc.js            # Lighthouse configuration
└── package.json                # Test scripts
```

## Unit Testing

### Component Testing

Components are tested using React Testing Library with Jest. Focus on:

- **Rendering**: Verify correct component structure and props
- **Interactions**: Test user interactions and state changes
- **Accessibility**: Ensure axe-core compliance
- **Error Handling**: Test error states and edge cases

Example component test:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInterface } from './ChatInterface'

describe('ChatInterface', () => {
  it('renders chat components correctly', () => {
    render(<ChatInterface />)

    expect(screen.getByTestId('chat-area')).toBeInTheDocument()
    expect(screen.getByTestId('message-input')).toBeInTheDocument()
  })

  it('handles sidebar toggle', () => {
    render(<ChatInterface />)

    const toggleButton = screen.getByTestId('toggle-sidebar')
    fireEvent.click(toggleButton)

    expect(toggleButton).toHaveTextContent('Toggle Open')
  })
})
```

### Hook Testing

Custom hooks are tested using `renderHook` from React Testing Library:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  it('returns debounced value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    expect(result.current).toBe('initial')

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })
})
```

### Utility Testing

Pure functions and utilities are tested with straightforward Jest tests:

```typescript
import { parseMessageContent } from './messageParser'

describe('parseMessageContent', () => {
  it('parses code blocks correctly', () => {
    const content = '```javascript\nconsole.log("test")\n```'
    const result = parseMessageContent(content)

    expect(result).toEqual([
      {
        type: 'code',
        content: 'console.log("test")',
        language: 'javascript'
      }
    ])
  })
})
```

## Integration Testing

Integration tests verify that components work together correctly:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInterface } from './ChatInterface'

describe('ChatInterface Integration', () => {
  it('creates and displays new conversation', async () => {
    const user = userEvent.setup()
    render(<ChatInterface />)

    const newChatButton = screen.getByRole('button', { name: /new chat/i })
    await user.click(newChatButton)

    await waitFor(() => {
      expect(screen.getByTestId('chat-area')).toHaveTextContent('New Chat')
    })
  })
})
```

## End-to-End Testing

E2E tests use Playwright to test complete user workflows:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Sign In")')

    await expect(page.locator('[data-testid="chat-area"]')).toBeVisible()
  })
})
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test auth.spec.ts
```

## Performance Testing

### Lighthouse CI

Automated performance testing using Lighthouse:

```bash
# Run performance tests
npm run lighthouse

# Run with custom configuration
lhci autorun --config=lighthouserc.js
```

### Bundle Size Monitoring

Monitor bundle size changes:

```javascript
// next.config.js
const withBundleAnalyzer = require('webpack-bundle-analyzer')

module.exports = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})
```

## Accessibility Testing

### Automated Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<MyComponent />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Manual Accessibility Testing

1. **Keyboard Navigation**: Test all interactive elements
2. **Screen Reader**: Verify announcements and navigation
3. **Color Contrast**: Ensure sufficient contrast ratios
4. **Focus Management**: Verify focus indicators and order

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:ci

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Run performance tests
        run: npm run lighthouse

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --watchAll=false",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:perf": "jest --testPathPattern=performance",
    "test:a11y": "jest --testPathPattern=a11y",
    "lighthouse": "lhci autorun"
  }
}
```

## Best Practices

### Test Organization

1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests with clear sections
3. **Test Isolation**: Each test should be independent
4. **Mock External Dependencies**: Mock APIs, databases, and external services

### Test Data Management

```typescript
// Use factories for consistent test data
const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides
})

const createMockConversation = (overrides = {}) => ({
  id: 'conv-1',
  title: 'Test Conversation',
  userId: 'user-1',
  ...overrides
})
```

### Async Testing

```typescript
it('handles async operations', async () => {
  const mockApiCall = jest.fn().mockResolvedValue({ data: 'success' })

  render(<AsyncComponent apiCall={mockApiCall} />)

  const button = screen.getByRole('button')
  fireEvent.click(button)

  await waitFor(() => {
    expect(screen.getByText('success')).toBeInTheDocument()
  })
})
```

### Error Testing

```typescript
it('handles errors gracefully', async () => {
  const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'))

  render(<ErrorComponent apiCall={mockApiCall} />)

  const button = screen.getByRole('button')
  fireEvent.click(button)

  await waitFor(() => {
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
```

## Troubleshooting

### Common Issues

1. **Flaky Tests**
   - Use `waitFor` instead of fixed timeouts
   - Mock external dependencies
   - Ensure test isolation

2. **Async Test Timeouts**
   - Increase timeout for slow operations
   - Use `act()` for state updates
   - Mock slow API calls

3. **Component Not Found**
   - Check component export/import
   - Verify test setup and providers
   - Use correct test IDs or roles

4. **Coverage Issues**
   - Add missing test cases
   - Exclude generated files from coverage
   - Use coverage thresholds appropriately

### Debugging Tests

```typescript
// Debug component rendering
const { debug } = render(<MyComponent />)
debug() // Prints component tree

// Debug with screen queries
screen.debug() // Prints current DOM

// Debug async operations
await waitFor(() => {
  screen.debug()
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

## Test Maintenance

### Regular Tasks

1. **Update Tests**: Keep tests in sync with code changes
2. **Review Coverage**: Ensure coverage goals are met
3. **Performance Monitoring**: Track test execution time
4. **Dependency Updates**: Update testing dependencies regularly

### Test Refactoring

```typescript
// Before: Repetitive test code
it('shows error for empty email', () => {
  render(<LoginForm />)
  const submitButton = screen.getByRole('button')
  fireEvent.click(submitButton)
  expect(screen.getByText('Email is required')).toBeInTheDocument()
})

it('shows error for empty password', () => {
  render(<LoginForm />)
  const submitButton = screen.getByRole('button')
  fireEvent.click(submitButton)
  expect(screen.getByText('Password is required')).toBeInTheDocument()
})

// After: Shared setup and utilities
const setupLoginForm = () => {
  render(<LoginForm />)
  return {
    submitButton: screen.getByRole('button'),
    emailInput: screen.getByLabelText('Email'),
    passwordInput: screen.getByLabelText('Password')
  }
}

it('shows validation errors', () => {
  const { submitButton } = setupLoginForm()
  fireEvent.click(submitButton)

  expect(screen.getByText('Email is required')).toBeInTheDocument()
  expect(screen.getByText('Password is required')).toBeInTheDocument()
})
```

This testing guide provides a comprehensive foundation for maintaining high-quality, reliable tests across the entire application.