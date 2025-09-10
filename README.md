# Sleek Modern Chat Interface

A modern, lightweight chat interface inspired by Open WebUI and Claude, built with Next.js, featuring real-time AI conversations, multiple model support, and a clean, responsive design.

## 🚀 Current Status: **FULLY FUNCTIONAL** ✅

### ✅ **Completed Features**
- **Authentication**: Supabase Auth with user management
- **Chat Interface**: Complete UI with message bubbles, input, and conversation management
- **AI Integration**: OpenRouter API with streaming responses
- **File Upload Support**: Image upload with vision model integration (JPEG, PNG, GIF, WebP)
- **Database**: Supabase with real-time subscriptions
- **Model Selection**: Dynamic model loading with search functionality
- **Responsive Design**: Mobile and desktop optimized
- **Theme Support**: Dark/light mode toggle
- **Real-time Updates**: Live message synchronization

### 🔧 **Setup Required**
1. **Execute Database Schema** in Supabase SQL Editor
2. **Set OpenRouter API Key** in application settings
3. **Run Development Server**

---

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Setup](#database-setup)
- [API Configuration](#api-configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- OpenRouter API key

### 1. Clone and Install
```bash
git clone <repository-url>
cd sleek-chat-interface
pnpm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Setup
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `docs/database-schema.sql`
3. Execute the SQL script
4. Verify tables created: `conversations`, `messages`, `users`, `user_settings`

### 4. API Key Setup
1. Get API key from [OpenRouter](https://openrouter.ai/keys)
2. In app: Settings → API Keys → Enter your key
3. Or via console: `localStorage.setItem('openrouter_api_key', 'your-key')`

### 5. Run Development
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ✨ Features

### Core Functionality
- ✅ **Real-time Chat**: Streaming AI responses
- ✅ **Free Model Support**: Curated selection of free OpenRouter models
- ✅ **Conversation Management**: Create, rename, delete chats
- ✅ **Message History**: Persistent chat storage
- ✅ **Model Selection**: Dynamic model loading with search

### User Experience
- ✅ **Responsive Design**: Mobile-first approach
- ✅ **Dark/Light Mode**: System preference detection
- ✅ **Smooth Animations**: Modern transitions
- ✅ **Accessibility**: WCAG AA compliance
- ✅ **Error Handling**: Graceful error states

### Advanced Features
- ✅ **Real-time Sync**: Live message updates
- ✅ **API Key Management**: Secure key storage
- ✅ **Theme Customization**: Personal preferences
- ✅ **Search Functionality**: Model and conversation search
- ✅ **File Upload Ready**: Infrastructure for images

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks + Context
- **UI Components**: Custom component library

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase subscriptions
- **API**: RESTful with OpenRouter integration

### Development Tools
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: Jest + React Testing Library
- **Build**: Next.js built-in

---

## 📁 Project Structure

```
sleek-chat-interface/
├── apps/
│   └── web/                    # Next.js application
│       ├── src/
│       │   ├── app/           # Next.js app router
│       │   ├── components/    # React components
│       │   │   ├── auth/      # Authentication components
│       │   │   ├── chat/      # Chat interface components
│       │   │   ├── layout/    # Layout components
│       │   │   └── settings/  # Settings components
│       │   ├── contexts/      # React contexts
│       │   ├── hooks/         # Custom hooks
│       │   ├── lib/           # Utility libraries
│       │   └── types/         # TypeScript definitions
│       └── public/            # Static assets
├── packages/                   # Shared packages (future)
├── docs/                       # Documentation
│   ├── architecture.md        # System architecture
│   ├── brief.md               # Project brief
│   ├── prd.md                 # Product requirements
│   ├── front-end-spec.md      # UI/UX specifications
│   └── database-schema.sql    # Database setup
├── pnpm-workspace.yaml        # Workspace configuration
└── README.md                  # This file
```

---

## 🗄️ Database Setup

### Automatic Setup
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Run `docs/database-schema.sql`

### Manual Verification
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Should return: conversations, messages, users, user_settings
```

### Schema Overview
- **users**: Extended user profiles with API keys
- **conversations**: Chat conversations with metadata
- **messages**: Individual messages with roles
- **user_settings**: User preferences and settings

---

## 🔑 API Configuration

### OpenRouter Setup
1. Visit [OpenRouter Keys](https://openrouter.ai/keys)
2. Generate new API key
3. Set in app: Settings → API Keys
4. Or via console: `localStorage.setItem('openrouter_api_key', 'your-key')`

### Supabase Setup
1. Create project at [Supabase](https://supabase.com)
2. Get URL and anon key from Settings → API
3. Add to `.env.local`

---

## 💻 Development

### Available Scripts
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test         # Run tests
pnpm type-check   # TypeScript type checking
pnpm storybook    # Start Storybook development server
pnpm build-storybook # Build Storybook for production
```

### Development Workflow
1. **Feature Branch**: `git checkout -b feature/new-feature`
2. **Development**: Make changes with hot reload
3. **Testing**: Run tests and manual testing
4. **Commit**: `git commit -m "Add new feature"`
5. **Pull Request**: Create PR for review

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Airbnb config with React rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality

### Storybook Component Library

The project includes a comprehensive Storybook setup for component development and documentation:

#### Features
- **Interactive Component Playground**: Test components with different props and states
- **Theme Switching**: Toggle between light and dark modes
- **Responsive Testing**: Viewport controls for mobile, tablet, and desktop
- **Accessibility Testing**: Built-in axe-core integration for a11y validation
- **Performance Profiling**: Real-time component performance metrics
- **Design System**: Complete color palette, typography, and spacing showcase

#### Getting Started
```bash
# Start Storybook development server
pnpm storybook

# Build Storybook for production
pnpm build-storybook
```

#### Available Stories
- **UI Components**: LoadingSpinner, ConfirmDialog, ErrorMessage, EmptyState
- **Chat Components**: MessageBubble, MessageInput, ChatArea
- **Design System**: Colors, typography, spacing, and design tokens
- **Debug Tools**: Accessibility testing, performance profiling, state inspection

#### Storybook URL
- **Development**: [http://localhost:6006](http://localhost:6006)
- **Production**: [https://storybook.sleek-chat-interface.dev](https://storybook.sleek-chat-interface.dev)

#### Usage Guidelines
1. **Component Stories**: Each component has multiple stories showing different states
2. **Controls**: Use the Controls panel to modify props interactively
3. **Themes**: Switch between light/dark themes using the toolbar
4. **Viewports**: Test responsive behavior with viewport controls
5. **Accessibility**: Run automated accessibility tests in debug stories

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### Other Platforms
- **Netlify**: Connect GitHub repo
- **Railway**: Automatic deployments
- **AWS Amplify**: Full-stack deployment

---

## 🔧 Troubleshooting

### Common Issues

#### ❌ "Table doesn't exist" Error
**Solution**: Execute database schema in Supabase SQL Editor
```sql
-- Run docs/database-schema.sql
```

#### ❌ "API key not found" Error
**Solution**: Set OpenRouter API key
```javascript
// In browser console
localStorage.setItem('openrouter_api_key', 'your-key-here')
```

#### ❌ "Foreign key constraint" Error
**Solution**: Create missing user record
```sql
INSERT INTO public.users (id, email)
VALUES ('your-user-id', 'your-email')
ON CONFLICT (id) DO NOTHING;
```

#### ❌ ChunkLoadError
**Solution**: Clear Next.js cache
```bash
rm -rf apps/web/.next
pnpm dev
```

### Debug Tools
- **Browser Console**: Detailed logging enabled
- **Debug Button**: Test connections in message input
- **Network Tab**: Monitor API calls
- **Supabase Logs**: Check database queries

---

## 📈 Roadmap

### ✅ Completed
- [x] Core chat functionality
- [x] Authentication system
- [x] Database integration
- [x] OpenRouter API integration
- [x] Responsive UI components
- [x] Real-time synchronization

### 🔄 In Progress
- [ ] File upload support
- [ ] Code syntax highlighting
- [ ] Conversation export
- [ ] Prompt library
- [ ] Advanced error recovery

### 🔮 Future
- [ ] Multi-user collaboration
- [ ] Plugin ecosystem
- [ ] Mobile app
- [ ] Enterprise features

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure TypeScript compliance
- Test on multiple devices

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: See `docs/` folder

---

**🎉 Your modern AI chat interface is ready! Start building amazing conversations.**