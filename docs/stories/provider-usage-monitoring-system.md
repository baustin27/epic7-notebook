# Story: Provider Usage Monitoring & Feature Control System

## User Story

As a **system administrator**,
I want **real-time monitoring and control over which features are making calls to AI providers with token usage tracking and cost analysis, plus the ability to disable specific features**,
So that **I can control costs, monitor feature-specific usage, prevent unexpected charges, and maintain granular control over AI provider consumption**.

## Story Context

**Existing System Integration:**
- Integrates with: Current OpenRouter integration, provider factory system, authentication
- Technology: Next.js 14 App Router, Supabase PostgreSQL, TypeScript, existing provider clients
- Follows pattern: Existing admin interfaces and dashboard components
- Touch points: All AI provider API calls, feature flags system, middleware logging

## Acceptance Criteria

**Functional Requirements:**

1. **Real-time Feature Usage Dashboard**: Display which specific features (chat, writing assistant, etc.) are making provider calls, with live token counts and cost calculations
2. **Feature Toggle System**: Persistent on/off switches for each feature that makes provider calls, with immediate effect
3. **Call Interception & Logging**: Automatic tracking of all provider API calls with metadata (feature, user, tokens, cost, timestamp)
4. **Cost Analysis**: Real-time cost tracking per feature, per user, with daily/weekly/monthly breakdowns
5. **Usage Alerts**: Configurable alerts when features exceed token or cost thresholds

**Integration Requirements:**

6. **Zero Impact**: All existing provider functionality continues unchanged when monitoring is enabled
7. **Transparent Integration**: Feature disable/enable works immediately without requiring restarts
8. **Admin Access Control**: Only admin users can access the monitoring dashboard and toggle features

**Quality Requirements:**

9. **Performance**: Monitoring adds <50ms overhead to provider calls
10. **Persistence**: Feature toggle state survives server restarts and deployments
11. **Real-time Updates**: Dashboard updates immediately when features are toggled or calls are made

## Technical Implementation Tasks

### Task 1: Provider Call Interception System
- [x] Create middleware wrapper for all provider clients (openai, anthropic, google, xai, openrouter)
- [x] Implement call logging with metadata: `{ feature, userId, provider, model, tokens, cost, timestamp }`
- [x] Add feature identification to all provider call sites
- [x] Create Supabase table for provider call logs with proper indexing

### Task 2: Feature Toggle Infrastructure  
- [x] Create feature flags table in Supabase with persistent storage
- [x] Implement feature toggle service with real-time state management
- [x] Add feature flag checks to all provider call points
- [x] Create admin API endpoints for toggling features

### Task 3: Usage Monitoring Dashboard
- [x] Build admin dashboard showing real-time feature usage
- [x] Display current feature states (enabled/disabled) with toggle controls
- [x] Show live token usage and cost calculations per feature
- [x] Add usage charts and cost breakdowns with time filters

### Task 4: Cost Tracking & Alerts
- [x] Implement real-time cost calculation using provider pricing models
- [x] Create configurable cost/token threshold alerts
- [x] Add cost projection and trend analysis
- [x] Email/notification system for threshold breaches

### Task 5: Feature Integration Points
- [x] Add feature flags to chat interface (main conversation)
- [x] Add feature flags to writing assistant
- [x] Add feature flags to any other AI-powered features
- [x] Ensure graceful degradation when features are disabled

## Technical Notes

**Integration Approach:**
- Wrap existing provider clients with monitoring middleware
- Use Supabase real-time for live dashboard updates
- Store feature flags in database with memory caching for performance
- Add feature identification context to all provider calls

**Database Schema Changes:**
```sql
CREATE TABLE provider_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10,6) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE feature_flags (
  feature_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);
```

**Key Constraints:**
- Feature toggles must take effect immediately (<1 second)
- Monitoring must not impact chat response times
- Cost calculations must be accurate to prevent billing surprises
- Admin controls must be secure and auditable

## Definition of Done

- [ ] All provider calls are intercepted and logged with feature context
- [ ] Admin dashboard shows real-time usage per feature with costs
- [ ] Feature toggle switches work immediately and persist across restarts
- [ ] Cost tracking is accurate and includes all provider pricing models
- [ ] Disabled features show graceful error messages to users
- [ ] Zero performance impact on existing chat functionality
- [ ] Admin access controls properly enforced
- [ ] Usage alerts fire when thresholds are exceeded
- [ ] All existing tests pass and new functionality is covered

## Risk and Compatibility Check

**Primary Risk:** Feature toggles could break user experience if not implemented gracefully

**Mitigation:** 
- Implement proper error boundaries and fallback UI
- Add comprehensive testing for disabled feature states
- Provide clear user messaging when features are unavailable
- Admin preview mode to test changes before applying

**Rollback:** 
- Feature flags default to "enabled" state
- Monitoring can be disabled via environment variable
- Database changes are additive only

**Compatibility Verification:**
- [x] No breaking changes to existing provider APIs
- [x] All current functionality preserved when monitoring is active
- [x] Performance impact minimized through efficient logging
- [x] Admin controls follow existing authentication patterns

---

## Agent Model Used
Claude-3.5-Sonnet

## Dev Agent Record

### Debug Log References
- None yet

### Completion Notes List
- Story created for provider usage monitoring system
- All 5 core tasks completed successfully
- Database schema implemented with proper indexing and RLS policies
- Provider call interception system operational with real-time logging
- Feature toggle infrastructure with persistent state management
- Comprehensive admin dashboard with real-time updates
- Cost tracking and alerting system implemented
- Integration points updated to use monitored clients
- Ready for database schema deployment

### File List
- `docs/stories/provider-usage-monitoring-system.md` (created)
- `apps/web/src/lib/database/schema-provider-monitoring.sql` (created)
- `apps/web/src/lib/monitoring/provider-monitor.ts` (created)
- `apps/web/src/lib/monitoring/alerts.ts` (created)
- `apps/web/src/hooks/useFeatureFlags.ts` (created)
- `apps/web/src/components/admin/FeatureTogglePanel.tsx` (created)
- `apps/web/src/components/admin/UsageMonitoringDashboard.tsx` (created)
- `apps/web/src/app/admin/dashboard/page.tsx` (created)
- `apps/web/src/app/api/admin/feature-flags/route.ts` (created)
- `apps/web/src/app/api/admin/usage-stats/route.ts` (created)
- `apps/web/src/lib/providers/factory.ts` (modified)
- `apps/web/src/lib/ai-service.ts` (modified)

### Change Log
- 2025-01-10: Created story for provider usage monitoring & feature control system
- 2025-01-10: Implemented all core monitoring infrastructure
- 2025-01-10: Created admin dashboard and API endpoints
- 2025-01-10: Integrated monitoring with existing AI service layer

## Status
Ready for Review

---

*Created by Developer Agent (James)*  
*Date: 2025-01-10*