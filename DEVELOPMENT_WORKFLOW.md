# Development Workflow Guide

## 🔄 Branching Strategy

This project follows a **Git Flow** branching model with CI/CD automation.

### Branch Structure

```
main (production)
├── develop (integration)
├── feature/feature-name
├── hotfix/fix-name
└── release/version-number
```

### Branch Types

- **`main`** - Production-ready code, protected branch
- **`develop`** - Integration branch for features, protected branch  
- **`feature/*`** - New features and enhancements
- **`hotfix/*`** - Critical fixes for production
- **`release/*`** - Release preparation and final testing

## 🚀 Development Workflow

### 1. Starting New Work

```bash
# Start from develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Push and set upstream
git push -u origin feature/your-feature-name
```

### 2. Daily Development

```bash
# Make your changes
git add .
git commit -m "feat: implement user authentication"

# Push changes
git push origin feature/your-feature-name

# Keep feature branch up to date
git checkout develop
git pull origin develop
git checkout feature/your-feature-name
git rebase develop
```

### 3. Code Quality Checks

Before pushing, run local checks:

```bash
cd apps/web

# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Unit tests
pnpm run test

# E2E tests (optional locally)
pnpm run test:e2e
```

### 4. Creating Pull Requests

1. **Push your feature branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR via GitHub CLI**
   ```bash
   gh pr create \
     --title "feat: implement user authentication" \
     --body "Implements login/logout functionality with Supabase auth" \
     --base develop \
     --assignee @me
   ```

3. **PR Requirements**
   - ✅ All CI checks must pass
   - ✅ Code review approval required
   - ✅ No conflicts with target branch
   - ✅ Feature branch up to date

## 🔒 Branch Protection Rules

### Main Branch (`main`)
- ❌ Direct pushes blocked
- ✅ Pull request required
- ✅ Dismiss stale reviews
- ✅ Require review from CODEOWNERS
- ✅ Require status checks:
  - `test` (unit tests, linting, type checking)
  - `e2e` (end-to-end tests)
  - `security-scan` (CodeQL, Trivy)
  - `bundle-analysis`

### Develop Branch (`develop`)
- ❌ Direct pushes blocked
- ✅ Pull request required
- ✅ Require status checks:
  - `test`
  - `e2e`

## 🤖 CI/CD Pipeline

### Continuous Integration (`.github/workflows/test.yml`)

Triggers on: `push` and `pull_request` to `main`/`develop`

**Parallel Jobs:**
1. **Test Matrix** (Node 18.x, 20.x)
   - Type checking
   - ESLint
   - Unit tests (80% coverage required)
   - Build verification

2. **End-to-End Tests**
   - Playwright tests
   - Cross-browser testing

3. **Performance Testing**
   - Lighthouse CI
   - Bundle size analysis

4. **Security Scanning**
   - npm audit
   - CodeQL analysis
   - Trivy vulnerability scan

5. **Accessibility Testing**
   - a11y compliance checks

6. **Storybook Build**
   - Component documentation

### Continuous Deployment (`.github/workflows/deploy.yml`)

**Deployment Environments:**

1. **Preview** (Pull Requests)
   - Deployed to Vercel preview
   - Automatic PR comments with preview URL

2. **Staging** (`develop` branch)
   - Deployed to staging environment
   - Smoke tests run post-deployment

3. **Production** (`main` branch)
   - Manual approval required
   - Blue-green deployment
   - Automatic rollback on failure

## 📝 Commit Conventions

Follow [Conventional Commits](https://conventionalcommits.org/):

```bash
# Features
git commit -m "feat: add user authentication"
git commit -m "feat(chat): implement real-time messaging"

# Bug fixes
git commit -m "fix: resolve login redirect issue"
git commit -m "fix(api): handle rate limit errors"

# Documentation
git commit -m "docs: update API documentation"

# Refactoring
git commit -m "refactor: optimize chat message rendering"

# Tests
git commit -m "test: add unit tests for auth service"

# Chores
git commit -m "chore: update dependencies"
```

## 🚨 Emergency Hotfixes

For critical production issues:

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# Make fix and test thoroughly
# ...

# Merge to main
gh pr create --base main --title "hotfix: fix critical security issue"

# Also merge to develop
git checkout develop
git merge hotfix/critical-fix
git push origin develop
```

## 🔧 Development Commands

### Local Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run in specific app
cd apps/web && pnpm dev
```

### Testing
```bash
# Unit tests
pnpm test
pnpm test:watch
pnpm test:coverage

# E2E tests
pnpm test:e2e
pnpm test:e2e:ui

# All tests
pnpm test:ci
```

### Code Quality
```bash
# Linting
pnpm lint
pnpm lint:fix

# Type checking
pnpm type-check

# Format code
pnpm format
```

### Building
```bash
# Production build
pnpm build

# Build with analysis
pnpm build:analyze

# Storybook
pnpm build-storybook
```

## 🏷️ Release Process

### 1. Prepare Release
```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# Update version numbers, CHANGELOG.md
# Run final tests
pnpm test:ci
```

### 2. Deploy to Staging
```bash
# Push release branch
git push origin release/v1.2.0

# Staging deployment happens automatically
# Run UAT and final testing
```

### 3. Production Release
```bash
# Merge to main
gh pr create --base main --title "release: v1.2.0"

# After approval and merge:
git checkout main
git pull origin main
git tag v1.2.0
git push origin v1.2.0

# Merge back to develop
git checkout develop
git merge main
git push origin develop
```

## 🛠️ Troubleshooting

### CI/CD Issues

**Tests failing?**
```bash
# Run tests locally first
pnpm test:ci

# Check specific failure
pnpm test -- --verbose
```

**Build failing?**
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

**Deployment issues?**
- Check Vercel dashboard
- Verify environment variables
- Review deployment logs in GitHub Actions

### Branch Issues

**Merge conflicts?**
```bash
# Rebase feature branch
git checkout feature/your-feature
git rebase develop

# Resolve conflicts and continue
git add .
git rebase --continue
```

**Branch protection bypassing?**
- Only repository admins can bypass rules
- Use GitHub CLI or web interface for emergency overrides

## 📚 Additional Resources

- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://conventionalcommits.org/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Storybook Documentation](https://storybook.js.org/docs)

## 🤝 Team Communication

- **Daily standups**: Share branch status and blockers
- **PR reviews**: Provide constructive feedback within 24 hours
- **Release planning**: Coordinate feature branch completion
- **Incident response**: Use hotfix workflow for critical issues

---

**Questions?** Check existing issues or create a new one for workflow improvements.