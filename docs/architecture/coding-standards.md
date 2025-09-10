# Coding Standards - Sleek Modern Chat Interface

## Overview

These coding standards define the specific patterns and conventions for the Sleek Modern Chat Interface project. AI agents MUST follow these standards when implementing features or making modifications.

## Critical Rules

### Type Safety & TypeScript

**✅ REQUIRED:**
- Use strict TypeScript configuration (`strict: true`)
- All database types MUST use generated Supabase types from `src/types/database.ts`
- Never use `any` type - use `unknown` for truly unknown values
- Use Zod for runtime validation of external data

```typescript
// ✅ Correct - Use generated Supabase types
import type { Database } from '../types/database'
type Conversation = Database['public']['Tables']['conversations']['Row']

// ❌ Wrong - Manual type definition
interface Conversation {
  id: string
  title: string
  // ... manual properties
}
```

### Component Patterns

**✅ REQUIRED:**
- Use functional components with TypeScript interfaces
- Props interfaces must be explicitly defined
- Use React.FC only when needed for children
- Custom hooks for all business logic

```typescript
// ✅ Correct Component Pattern
interface MessageBubbleProps {
  message: Message
  isUser: boolean
  onEdit?: () => void
}

export const MessageBubble = ({ message, isUser, onEdit }: MessageBubbleProps) => {
  return (
    <div className={cn("message-bubble", isUser && "user-message")}>
      {message.content}
    </div>
  )
}
```

### State Management

**✅ REQUIRED:**
- Use React Context for global state (AuthContext)
- Custom hooks for component-level state logic
- Zustand for complex state that needs persistence
- Never mutate state directly - always use setState patterns

```typescript
// ✅ Correct - Custom hook pattern
export const useRealtime = (conversationId: string) => {
  const [messages, setMessages] = useState<Message[]>([])
  
  useEffect(() => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { ... }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [conversationId])
  
  return { messages }
}
```

### API Integration Patterns

**✅ REQUIRED:**
- All Supabase calls must go through `src/lib/supabase.ts`
- OpenRouter calls must go through `src/lib/openrouter.ts`
- Never use direct fetch() calls - use service layer
- Always handle errors with proper user feedback

```typescript
// ✅ Correct - Use service layer
import { supabase } from '@/lib/supabase'

export const createConversation = async (title: string, model: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ title, model })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ❌ Wrong - Direct fetch call
const response = await fetch('/api/conversations', { ... })
```

### Error Handling

**✅ REQUIRED:**
- Use React Error Boundaries for component errors
- Try-catch blocks for async operations
- User-friendly error messages, not technical details
- Log errors to console in development

```typescript
// ✅ Correct Error Handling
try {
  const conversation = await createConversation(title, model)
  setConversations(prev => [conversation, ...prev])
} catch (error) {
  console.error('Failed to create conversation:', error)
  toast.error('Failed to create conversation. Please try again.')
}
```

## File Organization Standards

### Directory Structure

```
src/
├── app/               # Next.js App Router pages
├── components/        # React components by domain
│   ├── auth/         # Authentication components
│   ├── chat/         # Chat-specific components
│   ├── layout/       # Layout components
│   └── settings/     # Settings components
├── contexts/         # React contexts
├── hooks/            # Custom React hooks
├── lib/              # Utility libraries and clients
└── types/            # TypeScript type definitions
```

### File Naming

- **Components**: PascalCase (e.g., `MessageBubble.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useRealtime.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: camelCase (e.g., `database.ts`)

## CSS and Styling Standards

**✅ REQUIRED:**
- Use Tailwind CSS utility classes
- Use `cn()` utility for conditional classes
- No inline styles except for dynamic values
- Use CSS variables for theme colors

```typescript
// ✅ Correct - Tailwind with conditional classes
import { cn } from '@/lib/utils'

export const MessageBubble = ({ isUser, className }: Props) => {
  return (
    <div className={cn(
      "rounded-lg p-3 max-w-[80%]",
      isUser ? "bg-blue-500 text-white ml-auto" : "bg-gray-100 text-gray-900",
      className
    )}>
      {content}
    </div>
  )
}
```

## Database Interaction Standards

**✅ REQUIRED:**
- Always use Row Level Security (RLS) policies
- Use Supabase client with proper types
- Handle database errors gracefully
- Use transactions for multi-table operations

```typescript
// ✅ Correct - Typed Supabase query
const { data: conversations, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })

if (error) {
  console.error('Database error:', error)
  throw new Error('Failed to fetch conversations')
}
```

## Testing Standards

**✅ REQUIRED:**
- Unit tests for all custom hooks
- Component tests for critical UI components
- Integration tests for API interactions
- Use React Testing Library patterns

```typescript
// ✅ Correct Test Pattern
import { render, screen } from '@testing-library/react'
import { MessageBubble } from './MessageBubble'

const mockMessage = {
  id: '1',
  content: 'Test message',
  role: 'user' as const,
  created_at: new Date().toISOString()
}

test('renders user message with correct styling', () => {
  render(<MessageBubble message={mockMessage} isUser={true} />)
  
  expect(screen.getByText('Test message')).toBeInTheDocument()
  expect(screen.getByTestId('message-bubble')).toHaveClass('user-message')
})
```

## Security Standards

**✅ REQUIRED:**
- Never expose API keys in client-side code
- Use environment variables for all configuration
- Sanitize user inputs with DOMPurify
- Implement proper authentication checks

## Performance Standards

**✅ REQUIRED:**
- Use React.memo for expensive components
- Implement proper loading states
- Use Suspense for lazy-loaded components
- Optimize images and assets

## Import Standards

```typescript
// ✅ Correct Import Order
// 1. React and Next.js imports
import React from 'react'
import { NextPage } from 'next'

// 2. Third-party library imports
import { createClient } from '@supabase/supabase-js'

// 3. Internal imports (absolute paths)
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

// 4. Relative imports
import './Component.module.css'
```

## Environment Configuration

**✅ REQUIRED:**
- All environment variables must be in `.env.example`
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Validate environment variables at startup

```typescript
// ✅ Correct Environment Usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}
```

## Git Commit Standards

**✅ REQUIRED:**
- Use conventional commit format
- Keep commits atomic and focused
- Write descriptive commit messages

```
feat: add real-time message synchronization
fix: resolve conversation deletion bug
docs: update API documentation
refactor: simplify message rendering logic
```

## Code Review Checklist

Before submitting code, ensure:
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Follows component patterns
- [ ] Proper error handling implemented
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] Documentation updated if needed

## Accessibility Standards

**✅ REQUIRED for WCAG 2.1 AA Compliance:**

### ARIA and Semantic HTML
- Use semantic HTML elements (article, section, nav, main, header, footer)
- Add appropriate ARIA roles, states, and properties for complex components
- Use `aria-labelledby` and `aria-describedby` for labels and descriptions
- Implement `aria-live="polite"` for dynamic content updates

```typescript
// ✅ Correct ARIA implementation
<div role="article" aria-labelledby="message-label" aria-describedby="timestamp-desc">
  <h3 id="message-label" className="sr-only">User message</h3>
  <p>{message.content}</p>
  <time id="timestamp-desc">10:30 AM</time>
</div>
```

### Keyboard Navigation (WCAG 2.1.1, 2.4.3)
- All interactive elements must be focusable via Tab
- Logical focus order (natural reading order)
- No keyboard traps - users can Tab away from components
- Visible focus indicators with 3:1 contrast ratio
- Use `useKeyboardNavigation` hook for global shortcuts (Esc, Ctrl+Arrow, Alt+1-9)

### Color Contrast (WCAG 1.4.3)
- Text content: 4.5:1 ratio for normal text, 3:1 for large text
- Non-text elements: 3:1 contrast against adjacent colors
- Use Tailwind a11y colors (`a11y-focus`, `high-contrast`)
- Test with browser dev tools and color contrast analyzers

### Screen Reader Support (WCAG 4.1.2)
- Use `ScreenReaderOnly` component for hidden labels
- Implement `useScreenReaderAnnouncements` for dynamic updates
- Proper heading hierarchy (h1 > h2 > h3)
- Alt text for all meaningful images
- Form labels associated with inputs via `htmlFor` or `aria-labelledby`

### Focus Management (WCAG 2.4.7)
- Use `useFocusManagement` hook for modals and dialogs
- Trap focus within modals (first/last element cycling)
- Restore focus to trigger element on modal close
- Skip links for main content areas using `SkipLinks` component

### Motor Accessibility (WCAG 2.5.5)
- Touch targets minimum 44x44px on mobile
- Keyboard alternatives for all mouse interactions
- No time-based interactions without pause options

### Testing Requirements
- Automated: Add `expect(element).toHaveNoViolations()` to component tests using axe-core
- Manual: Test with screen readers (NVDA, VoiceOver), keyboard-only navigation, high contrast mode
- Tools: axe DevTools browser extension, WAVE tool, Lighthouse audits

### Compliance Checklist
- [ ] All components have a11y test with axe-core
- [ ] Keyboard navigation tested end-to-end
- [ ] Contrast ratios verified (4.5:1 for text)
- [ ] Screen reader announcements implemented for dynamic content
- [ ] Focus management working for all modals and overlays
- [ ] Skip links present and functional
- [ ] Reduced motion support via `@media (prefers-reduced-motion)`

**New Components/Hooks for Accessibility:**
- `useKeyboardNavigation.ts` - Global keyboard shortcuts
- `useScreenReaderAnnouncements.ts` - Live region announcements
- `useFocusManagement.ts` - Focus trapping for modals
- `ScreenReaderOnly.tsx` - Utility for screen reader content
- `SkipLinks.tsx` - Skip navigation links
- `accessibility.css` - Custom a11y styles

All new features must pass automated a11y tests and follow these guidelines to maintain WCAG 2.1 AA compliance.