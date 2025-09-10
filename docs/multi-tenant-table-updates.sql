-- Multi-tenant Table Updates
-- Add organization_id to existing tables and update RLS policies

-- Add organization_id to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS default_organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to conversations table
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to user_settings table
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to prompts table
ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to analytics_events table
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to model_performance table
ALTER TABLE public.model_performance ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to user_engagement table
ALTER TABLE public.user_engagement ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Create indexes for organization_id columns
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON public.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_organization_id ON public.user_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_prompts_organization_id ON public.prompts(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_organization_id ON public.analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_model_performance_organization_id ON public.model_performance(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_organization_id ON public.user_engagement(organization_id);

-- Update existing RLS policies to include organization filtering
-- Drop existing policies that will be replaced
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can create their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can create their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can update their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can delete their own prompts" ON public.prompts;

-- New multi-tenant RLS policies for users table
CREATE POLICY "Users can view profiles in their organizations" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = users.organization_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        ) OR users.id = auth.uid()
    );

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- New multi-tenant RLS policies for conversations table
CREATE POLICY "Users can view conversations in their organizations" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = conversations.organization_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can create conversations in their organizations" ON public.conversations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = conversations.organization_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can update conversations in their organizations" ON public.conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = conversations.organization_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can delete conversations in their organizations" ON public.conversations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = conversations.organization_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

-- New multi-tenant RLS policies for messages table
CREATE POLICY "Users can view messages in their organization conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.organization_members om ON c.organization_id = om.organization_id
            WHERE c.id = messages.conversation_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can create messages in their organization conversations" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.organization_members om ON c.organization_id = om.organization_id
            WHERE c.id = messages.conversation_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can update messages in their organization conversations" ON public.messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.organization_members om ON c.organization_id = om.organization_id
            WHERE c.id = messages.conversation_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can delete messages in their organization conversations" ON public.messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.organization_members om ON c.organization_id = om.organization_id
            WHERE c.id = messages.conversation_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

-- New multi-tenant RLS policies for user_settings table
CREATE POLICY "Users can view settings in their organizations" ON public.user_settings
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = user_settings.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can create their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- New multi-tenant RLS policies for prompts table
CREATE POLICY "Users can view prompts in their organizations" ON public.prompts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = prompts.organization_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can create prompts in their organizations" ON public.prompts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = prompts.organization_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can update prompts in their organizations" ON public.prompts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = prompts.organization_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

CREATE POLICY "Users can delete prompts in their organizations" ON public.prompts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = prompts.organization_id
            AND om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

-- Update analytics policies to be organization-aware
DROP POLICY IF EXISTS "Admins can view analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can view analytics metrics" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can view model performance" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can view user engagement" ON public.analytics_events;

CREATE POLICY "Organization admins can view their analytics events" ON public.analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = analytics_events.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
            AND om.is_active = true
        ) OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Users can view their own analytics events" ON public.analytics_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view their model performance" ON public.model_performance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = model_performance.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
            AND om.is_active = true
        ) OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Users can view their own model performance" ON public.model_performance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view their user engagement" ON public.user_engagement
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = user_engagement.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
            AND om.is_active = true
        ) OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Users can view their own user engagement" ON public.user_engagement
    FOR SELECT USING (auth.uid() = user_id);