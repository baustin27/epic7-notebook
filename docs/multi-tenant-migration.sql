-- Multi-tenant Migration Script
-- Run this to migrate existing single-tenant data to multi-tenant architecture

-- Step 1: Create default organizations for existing users
-- This creates a personal organization for each existing user
INSERT INTO public.organizations (name, slug, created_by)
SELECT
  COALESCE(u.full_name || '''s Organization', 'User Organization') as name,
  'org-' || u.id::text as slug,
  u.id as created_by
FROM public.users u
WHERE u.id NOT IN (
  SELECT DISTINCT om.user_id
  FROM public.organization_members om
  WHERE om.is_active = true
);

-- Step 2: Add existing users as owners of their default organizations
INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
SELECT
  o.id as organization_id,
  o.created_by as user_id,
  'owner' as role,
  o.created_at as joined_at
FROM public.organizations o
WHERE o.created_by NOT IN (
  SELECT DISTINCT om.user_id
  FROM public.organization_members om
  WHERE om.organization_id = o.id
);

-- Step 3: Update users table to set default_organization_id
UPDATE public.users
SET default_organization_id = om.organization_id
FROM public.organization_members om
WHERE users.id = om.user_id
AND om.role = 'owner'
AND om.is_active = true
AND users.default_organization_id IS NULL;

-- Step 4: Migrate existing conversations to user's default organization
UPDATE public.conversations
SET organization_id = u.default_organization_id
FROM public.users u
WHERE conversations.user_id = u.id
AND conversations.organization_id IS NULL
AND u.default_organization_id IS NOT NULL;

-- Step 5: Migrate existing messages to match their conversation's organization
UPDATE public.messages
SET organization_id = c.organization_id
FROM public.conversations c
WHERE messages.conversation_id = c.id
AND messages.organization_id IS NULL
AND c.organization_id IS NOT NULL;

-- Step 6: Migrate existing user_settings to user's default organization
UPDATE public.user_settings
SET organization_id = u.default_organization_id
FROM public.users u
WHERE user_settings.user_id = u.id
AND user_settings.organization_id IS NULL
AND u.default_organization_id IS NOT NULL;

-- Step 7: Migrate existing prompts to user's default organization
UPDATE public.prompts
SET organization_id = u.default_organization_id
FROM public.users u
WHERE prompts.user_id = u.id
AND prompts.organization_id IS NULL
AND u.default_organization_id IS NOT NULL;

-- Step 8: Migrate existing analytics_events to user's default organization
UPDATE public.analytics_events
SET organization_id = u.default_organization_id
FROM public.users u
WHERE analytics_events.user_id = u.id
AND analytics_events.organization_id IS NULL
AND u.default_organization_id IS NOT NULL;

-- Step 9: Migrate existing model_performance to user's default organization
UPDATE public.model_performance
SET organization_id = u.default_organization_id
FROM public.users u
WHERE model_performance.user_id = u.id
AND model_performance.organization_id IS NULL
AND u.default_organization_id IS NOT NULL;

-- Step 10: Migrate existing user_engagement to user's default organization
UPDATE public.user_engagement
SET organization_id = u.default_organization_id
FROM public.users u
WHERE user_engagement.user_id = u.id
AND user_engagement.organization_id IS NULL
AND u.default_organization_id IS NOT NULL;

-- Step 11: Create indexes for better performance (run after data migration)
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id_created_at ON public.conversations(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_organization_id_created_at ON public.messages(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_settings_organization_user ON public.user_settings(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_organization_category ON public.prompts(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_organization_type ON public.analytics_events(organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_model_performance_organization_model ON public.model_performance(organization_id, model);
CREATE INDEX IF NOT EXISTS idx_user_engagement_organization_date ON public.user_engagement(organization_id, date DESC);

-- Step 12: Update RLS policies to be more restrictive (run after migration is complete)
-- This ensures that only organization members can access organization data
-- The policies in multi-tenant-table-updates.sql should already handle this

-- Verification queries (run these to check migration success)
-- Count of users with default organizations:
-- SELECT COUNT(*) FROM public.users WHERE default_organization_id IS NOT NULL;

-- Count of conversations with organization_id:
-- SELECT COUNT(*) FROM public.conversations WHERE organization_id IS NOT NULL;

-- Count of organizations created:
-- SELECT COUNT(*) FROM public.organizations;

-- Count of organization members:
-- SELECT COUNT(*) FROM public.organization_members WHERE is_active = true;

-- Check for any orphaned records (should be 0 after migration):
-- SELECT COUNT(*) FROM public.conversations WHERE organization_id IS NULL;
-- SELECT COUNT(*) FROM public.messages WHERE organization_id IS NULL;
-- SELECT COUNT(*) FROM public.user_settings WHERE organization_id IS NULL;