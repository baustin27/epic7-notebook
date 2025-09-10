-- Multi-tenant Architecture Database Schema
-- Story 7.4: Multi-tenant Architecture Implementation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table - Core tenant management
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    industry TEXT,
    size TEXT CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'inactive')),
    settings JSONB DEFAULT '{}',
    billing_settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Organization Members table - User-organization relationships with roles
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- Organization Invitations table - Track pending invitations
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    token TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON public.organization_members(role);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON public.organization_invitations(token);

-- Create updated_at triggers
CREATE TRIGGER handle_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_organization_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations table
CREATE POLICY "Organization members can view their organizations" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.is_active = true
        )
    );

CREATE POLICY "Organization admins can update their organizations" ON public.organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
            AND organization_members.is_active = true
        )
    );

CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS Policies for organization_members table
CREATE POLICY "Users can view organization memberships" ON public.organization_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
            AND om.is_active = true
        )
    );

CREATE POLICY "Organization admins can manage members" ON public.organization_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = organization_members.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
            AND organization_members.is_active = true
        )
    );

-- RLS Policies for organization_invitations table
CREATE POLICY "Organization admins can manage invitations" ON public.organization_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = organization_invitations.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
            AND organization_members.is_active = true
        )
    );

CREATE POLICY "Users can view their own invitations" ON public.organization_invitations
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Function to create default organization for new users
CREATE OR REPLACE FUNCTION public.create_default_organization_for_user()
RETURNS TRIGGER AS $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Create a default organization for the new user
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (
        NEW.raw_user_meta_data->>'full_name' || '''s Organization',
        'org-' || NEW.id::text,
        NEW.id
    )
    RETURNING id INTO default_org_id;

    -- Add the user as owner of their default organization
    INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
    VALUES (default_org_id, NEW.id, 'owner', NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current organization context
CREATE OR REPLACE FUNCTION public.get_user_organization_context(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    user_role TEXT,
    permissions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        om.role,
        om.permissions
    FROM public.organizations o
    JOIN public.organization_members om ON o.id = om.organization_id
    WHERE om.user_id = p_user_id
    AND om.is_active = true
    ORDER BY om.joined_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission in organization
CREATE OR REPLACE FUNCTION public.has_organization_permission(
    p_user_id UUID,
    p_organization_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_permissions JSONB;
BEGIN
    SELECT role, permissions INTO user_role, user_permissions
    FROM public.organization_members
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check role-based permissions
    IF user_role IN ('owner', 'admin') THEN
        RETURN true;
    END IF;

    -- Check specific permissions
    IF user_permissions ? p_permission THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;