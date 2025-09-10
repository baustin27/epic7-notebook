# Source Tree - Sleek Modern Chat Interface

## Project Structure Overview

The Sleek Modern Chat Interface follows a monorepo structure optimized for a Next.js 14 application with future extensibility for shared packages.

## Root Level Structure

```
sleek-chat-interface/
├── apps/                       # Application packages
├── packages/                   # Shared packages (future expansion)
├── docs/                       # Documentation
├── .bmad-core/                # BMAD agent system configuration
├── lib/                       # Root-level shared utilities
├── .github/                   # GitHub workflows and templates
├── .claude/                   # Claude AI configuration
├── .vscode/                   # VS Code workspace configuration
├── middleware.ts              # Next.js security middleware
├── pnpm-workspace.yaml        # pnpm workspace configuration
├── package.json               # Root package.json for workspace
├── README.md                  # Project documentation
├── STATUS.md                  # Current implementation status
└── .env.example              # Environment variable template
```

## Apps Directory (`apps/`)

### Web Application (`apps/web/`)

The main Next.js 14 application using App Router architecture.

```
apps/web/
├── src/                       # Source code
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout with providers
│   │   ├── page.tsx          # Home page (main chat interface)
│   │   ├── globals.css       # Global Tailwind styles
│   │   └── loading.tsx       # Global loading UI
│   ├── components/           # React components organized by domain
│   │   ├── auth/            # Authentication components
│   │   │   └── LoginForm.tsx # User login form
│   │   ├── chat/            # Chat-specific components
│   │   │   ├── ChatArea.tsx  # Main chat display area
│   │   │   ├── MessageBubble.tsx # Individual message display
│   │   │   ├── MessageInput.tsx # Message composition input
│   │   │   ├── ModelSelector.tsx # AI model selection dropdown
│   │   │   └── Sidebar.tsx   # Conversation list sidebar
│   │   ├── layout/          # Layout components
│   │   │   ├── Header.tsx    # Application header
│   │   │   ├── Sidebar.tsx   # Navigation sidebar
│   │   │   └── ThemeToggle.tsx # Dark/light mode toggle
│   │   ├── settings/        # Settings components
│   │   │   ├── ApiKeySettings.tsx # API key management
│   │   │   └── SettingsModal.tsx # Settings modal dialog
│   │   └── ChatInterface.tsx # Main chat interface container
│   ├── contexts/            # React contexts for global state
│   │   └── AuthContext.tsx  # Authentication context provider
│   ├── hooks/               # Custom React hooks
│   │   ├── useRealtime.ts   # Supabase real-time subscriptions
│   │   └── useTheme.ts      # Theme management hook
│   ├── lib/                 # Utility libraries and API clients
│   │   ├── supabase.ts      # Supabase client configuration
│   │   ├── openrouter.ts    # OpenRouter API client
│   │   ├── database.ts      # Database helper functions
│   │   ├── test-connection.ts # Connection testing utilities
│   │   ├── test-database.ts # Database testing utilities
│   │   └── performance-tests.ts # Performance testing utilities
│   └── types/               # TypeScript type definitions
│       └── database.ts      # Generated Supabase database types
├── public/                  # Static assets
├── .next/                   # Next.js build output (auto-generated)
├── tests/                   # Test files (future)
├── package.json             # Web app dependencies and scripts
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Jest testing configuration
└── .env.local               # Local environment variables (not committed)
```

## Component Organization Principles

### Domain-Based Organization
Components are organized by functional domain rather than technical type:

- **`auth/`** - All authentication-related UI components
- **`chat/`** - Core chat interface components
- **`layout/`** - Application layout and navigation components
- **`settings/`** - User settings and configuration components

### Component Naming Convention
- **PascalCase** for all component files (e.g., `MessageBubble.tsx`)
- **Descriptive names** that clearly indicate the component's purpose
- **Co-location** of related components within domain folders

## Hooks Directory (`src/hooks/`)

Custom React hooks encapsulate business logic and side effects:

```
src/hooks/
├── useRealtime.ts            # Supabase real-time message synchronization
└── useTheme.ts               # Theme management and persistence
```

### Hook Naming Convention
- **camelCase** with 'use' prefix
- **Single responsibility** - each hook has one clear purpose
- **Return objects** for multiple values instead of arrays

## Lib Directory (`src/lib/`)

Core libraries and utilities for external service integration:

```
src/lib/
├── supabase.ts               # Supabase client with TypeScript types
├── openrouter.ts             # OpenRouter API client for AI models
├── database.ts               # Database helper functions and queries
├── test-connection.ts        # Connection testing utilities
├── test-database.ts          # Database testing and validation
└── performance-tests.ts      # Performance testing utilities
```

### Library Organization Principles
- **Service-specific files** - one file per external service
- **Helper functions** - database queries and utility functions
- **Type safety** - all external APIs properly typed
- **Error handling** - consistent error handling patterns

## Types Directory (`src/types/`)

TypeScript type definitions and interfaces:

```
src/types/
└── database.ts               # Generated Supabase database types
```

### Type Organization
- **Generated types** - Auto-generated from Supabase schema
- **Manual types** - Custom interfaces for application logic
- **Shared types** - Types used across multiple components

## Documentation Structure (`docs/`)

Comprehensive project documentation:

```
docs/
├── architecture/             # Architecture documentation
│   ├── coding-standards.md   # Development standards and patterns
│   ├── tech-stack.md         # Technology stack details
│   └── source-tree.md        # This file - source code organization
├── stories/                  # Development stories and tasks
├── prd/                      # Product Requirements Document (sharded)
├── architecture.md           # Main architecture document
├── brownfield-architecture.md # Current state documentation
├── prd.md                    # Product requirements
├── front-end-spec.md         # UI/UX specifications
├── brief.md                  # Project brief
└── database-setup-guide.md   # Database schema setup instructions
```

## Configuration Files

### Root Level Configuration
- **`pnpm-workspace.yaml`** - Monorepo workspace configuration
- **`package.json`** - Root workspace dependencies and scripts
- **`middleware.ts`** - Next.js security middleware

### Web App Configuration
- **`next.config.js`** - Next.js build and runtime configuration
- **`tailwind.config.js`** - Tailwind CSS customization
- **`tsconfig.json`** - TypeScript compiler configuration
- **`jest.config.js`** - Jest testing framework configuration
- **`.env.example`** - Environment variable template

## Build Output Structure

### Next.js Build Output (`.next/`)
```
.next/
├── static/                   # Static assets with cache hashing
├── server/                   # Server-side rendered pages
├── types/                    # Generated TypeScript types
└── cache/                    # Build cache for faster subsequent builds
```

### Build Artifacts
- **Static files** - Optimized CSS, JavaScript, and assets
- **Server components** - Pre-rendered React server components
- **API routes** - Serverless function builds
- **Type definitions** - Generated types for pages and API routes

## Import Path Conventions

### Absolute Imports
```typescript
// Use @ alias for src directory
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
```

### Relative Imports
```typescript
// Use relative paths only for closely related files
import './MessageBubble.styles.css'
import { MessageOptions } from './MessageOptions'
```

### Import Order
1. React and Next.js imports
2. Third-party library imports
3. Internal absolute imports (@/ paths)
4. Relative imports
5. Type-only imports (using `import type`)

## File Naming Conventions

### Components
- **PascalCase** - `MessageBubble.tsx`, `ChatInterface.tsx`
- **Descriptive names** - Name reflects the component's purpose
- **`.tsx` extension** - For files containing JSX

### Utilities and Hooks
- **camelCase** - `useRealtime.ts`, `formatDate.ts`
- **`use` prefix** - For custom React hooks
- **`.ts` extension** - For files without JSX

### Configuration Files
- **kebab-case** - `tailwind.config.js`, `jest.config.js`
- **Standard names** - Follow framework conventions

## Future Expansion Structure

### Packages Directory (`packages/`)
Prepared for future shared packages:

```
packages/
├── shared/                   # Shared types and utilities
│   ├── src/
│   │   ├── types/           # Shared TypeScript types
│   │   ├── constants/       # Application constants
│   │   └── utils/           # Shared utility functions
│   └── package.json
├── ui/                      # Shared UI component library
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Shared UI hooks
│   │   └── styles/          # Shared styles and themes
│   └── package.json
└── config/                  # Shared configuration
    ├── eslint/              # ESLint configurations
    ├── typescript/          # TypeScript configurations
    └── jest/                # Jest configurations
```

## Development Workflow Integration

### Source Control
- **Git ignore** - `.next/`, `node_modules/`, `.env.local`
- **Branch strategy** - Feature branches with descriptive names
- **Commit conventions** - Conventional commits format

### IDE Integration
- **VS Code workspace** - Configured for optimal development experience
- **TypeScript integration** - Full IntelliSense and type checking
- **ESLint integration** - Real-time code quality feedback

### Build System Integration
- **pnpm workspaces** - Efficient dependency management
- **Next.js build** - Optimized production builds
- **Vercel deployment** - Seamless deployment integration

This source tree structure promotes:
- **Maintainability** - Clear organization and separation of concerns
- **Scalability** - Easy addition of new features and components
- **Developer Experience** - Intuitive file organization and tooling
- **Type Safety** - Comprehensive TypeScript integration
- **Performance** - Optimized build output and code splitting