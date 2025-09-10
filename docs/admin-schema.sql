-- Administrative Control Panel Database Schema
-- Story 7.2: Administrative Control Panel

-- Create user_roles table for role-based access control
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL CHECK (role_name IN ('user', 'admin', 'moderator', 'analyst')),
    permissions JSONB DEFAULT '{}',
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_audit_log table for comprehensive audit trails
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    action_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_configuration table for dynamic settings
CREATE TABLE IF NOT EXISTS public.system_configuration (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB,
    config_type TEXT CHECK (config_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    category TEXT DEFAULT 'general',
    is_editable BOOLEAN DEFAULT true,
    requires_restart BOOLEAN DEFAULT false,
    validation_rules JSONB DEFAULT '{}',
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_health_metrics table for monitoring
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_type TEXT NOT NULL,
    metric_value NUMERIC,
    metric_unit TEXT,
    status TEXT CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_sessions table for session tracking
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON public.user_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON public.admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_system_configuration_category ON public.system_configuration(category);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_type ON public.system_health_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_recorded_at ON public.system_health_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.admin_sessions(session_token);

-- Insert default system configuration values
INSERT INTO public.system_configuration (config_key, config_value, config_type, description, category) VALUES
('app_name', '"AI Chat Platform"', 'string', 'Application name displayed in UI', 'general'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'system'),
('maintenance_message', '"System is under maintenance. Please try again later."', 'string', 'Message shown during maintenance', 'system'),
('max_conversations_per_user', '100', 'number', 'Maximum conversations per user', 'limits'),
('max_messages_per_conversation', '1000', 'number', 'Maximum messages per conversation', 'limits'),
('rate_limit_requests_per_minute', '60', 'number', 'API rate limit per user per minute', 'limits'),
('default_model', '"gpt-3.5-turbo"', 'string', 'Default AI model for new conversations', 'ai'),
('available_models', '["gpt-3.5-turbo", "gpt-4", "claude-3-sonnet"]', 'array', 'List of available AI models', 'ai'),
('analytics_enabled', 'true', 'boolean', 'Enable analytics tracking', 'features'),
('export_enabled', 'true', 'boolean', 'Enable conversation export feature', 'features'),
('prompt_library_enabled', 'true', 'boolean', 'Enable prompt library feature', 'features'),
('file_upload_enabled', 'false', 'boolean', 'Enable file upload feature', 'features'),
('admin_notification_email', '"admin@example.com"', 'string', 'Email for admin notifications', 'notifications'),
('system_alert_threshold', '90', 'number', 'CPU/memory usage threshold for alerts (%)', 'monitoring')
ON CONFLICT (config_key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for admin_audit_log
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "System can insert audit logs" ON public.admin_audit_log
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for system_configuration
CREATE POLICY "Admins can manage system configuration" ON public.system_configuration
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can read system configuration" ON public.system_configuration
    FOR SELECT USING (true);

-- Create RLS policies for system_health_metrics
CREATE POLICY "Admins can manage health metrics" ON public.system_health_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can read health metrics" ON public.system_health_metrics
    FOR SELECT USING (true);

-- Create RLS policies for admin_sessions
CREATE POLICY "Users can view their own sessions" ON public.admin_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all sessions" ON public.admin_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_action_type TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_action_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO public.admin_audit_log (
        admin_user_id,
        action_type,
        resource_type,
        resource_id,
        action_details,
        ip_address,
        user_agent,
        session_id
    ) VALUES (
        auth.uid(),
        p_action_type,
        p_resource_type,
        p_resource_id,
        p_action_details,
        p_ip_address,
        p_user_agent,
        p_session_id
    ) RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get system health status
CREATE OR REPLACE FUNCTION get_system_health_status()
RETURNS TABLE (
    metric_type TEXT,
    current_value NUMERIC,
    status TEXT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        shm.metric_type,
        shm.metric_value,
        shm.status,
        shm.recorded_at
    FROM public.system_health_metrics shm
    WHERE shm.recorded_at >= NOW() - INTERVAL '5 minutes'
    ORDER BY shm.recorded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update system configuration
CREATE OR REPLACE FUNCTION update_system_config(
    p_config_key TEXT,
    p_config_value JSONB,
    p_updated_by UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.system_configuration
    SET
        config_value = p_config_value,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE config_key = p_config_key;

    -- Log the configuration change
    PERFORM log_admin_action(
        'update_config',
        'system_configuration',
        p_config_key,
        jsonb_build_object('new_value', p_config_value)
    );

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;