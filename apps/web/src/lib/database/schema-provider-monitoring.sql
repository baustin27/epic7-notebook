-- Provider Usage Monitoring Database Schema
-- Created: 2025-01-10

-- Table for logging all provider API calls with usage metrics
CREATE TABLE IF NOT EXISTS provider_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL, -- e.g., 'chat', 'writing_assistant', 'model_management'
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL, -- e.g., 'openrouter', 'openai', 'anthropic'
  model TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
  cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
  request_duration_ms INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for managing feature flags and their states
CREATE TABLE IF NOT EXISTS feature_flags (
  feature_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Table for storing cost thresholds and alert configurations
CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT REFERENCES feature_flags(feature_name),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('daily_cost', 'weekly_cost', 'monthly_cost', 'daily_tokens', 'weekly_tokens', 'monthly_tokens')),
  threshold_value DECIMAL(15,6) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_provider_usage_logs_feature_created ON provider_usage_logs(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_usage_logs_user_created ON provider_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_usage_logs_provider_created ON provider_usage_logs(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_usage_logs_created_at ON provider_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_usage_logs_feature_success ON provider_usage_logs(feature, success);

-- Row Level Security Policies
ALTER TABLE provider_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can see all usage logs
CREATE POLICY IF NOT EXISTS "Admin users can view all provider usage logs" ON provider_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        'baustin2786@gmail.com' -- Replace with actual admin emails
      )
    )
  );

-- Policy: Users can see their own usage logs
CREATE POLICY IF NOT EXISTS "Users can view their own provider usage logs" ON provider_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert usage logs (for monitoring middleware)
CREATE POLICY IF NOT EXISTS "System can insert provider usage logs" ON provider_usage_logs
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts for monitoring

-- Policy: Admin users can manage feature flags
CREATE POLICY IF NOT EXISTS "Admin users can manage feature flags" ON feature_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        'baustin2786@gmail.com' -- Replace with actual admin emails
      )
    )
  );

-- Policy: All authenticated users can read feature flags (needed for checking if features are enabled)
CREATE POLICY IF NOT EXISTS "Authenticated users can read feature flags" ON feature_flags
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Admin users can manage usage alerts
CREATE POLICY IF NOT EXISTS "Admin users can manage usage alerts" ON usage_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        'baustin2786@gmail.com' -- Replace with actual admin emails
      )
    )
  );

-- Insert default feature flags
INSERT INTO feature_flags (feature_name, enabled, description) VALUES
  ('chat', true, 'Main chat conversation feature'),
  ('writing_assistant', true, 'AI writing assistant functionality'),
  ('model_management', true, 'Model testing and management features'),
  ('prompt_library', true, 'Prompt library and management'),
  ('file_upload', true, 'File upload and processing'),
  ('conversation_export', true, 'Conversation export functionality')
ON CONFLICT (feature_name) DO NOTHING;

-- Insert default usage alerts (example thresholds)
INSERT INTO usage_alerts (feature_name, alert_type, threshold_value) VALUES
  ('chat', 'daily_cost', 10.00),
  ('chat', 'weekly_cost', 50.00),
  ('chat', 'monthly_cost', 200.00),
  ('writing_assistant', 'daily_cost', 5.00),
  ('writing_assistant', 'weekly_cost', 25.00)
ON CONFLICT DO NOTHING;

-- Database functions for efficient aggregation
CREATE OR REPLACE FUNCTION get_feature_usage_summary(
  p_feature_name TEXT DEFAULT NULL,
  p_time_period INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
  feature TEXT,
  total_calls BIGINT,
  total_tokens_input BIGINT,
  total_tokens_output BIGINT,
  total_cost_usd DECIMAL(15,6),
  avg_duration_ms DECIMAL(10,2),
  success_rate DECIMAL(5,4),
  unique_users BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    pul.feature,
    COUNT(*) as total_calls,
    COALESCE(SUM(pul.tokens_input), 0) as total_tokens_input,
    COALESCE(SUM(pul.tokens_output), 0) as total_tokens_output,
    COALESCE(SUM(pul.cost_usd), 0) as total_cost_usd,
    COALESCE(AVG(pul.request_duration_ms)::DECIMAL(10,2), 0) as avg_duration_ms,
    (COUNT(*) FILTER (WHERE pul.success = true)::DECIMAL / COUNT(*)::DECIMAL)::DECIMAL(5,4) as success_rate,
    COUNT(DISTINCT pul.user_id) as unique_users
  FROM provider_usage_logs pul
  WHERE
    (p_feature_name IS NULL OR pul.feature = p_feature_name)
    AND pul.created_at >= NOW() - p_time_period
  GROUP BY pul.feature
  ORDER BY total_cost_usd DESC;
$$;

-- Function to check if a feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM feature_flags WHERE feature_name = p_feature_name),
    true -- Default to enabled if not found
  );
$$;

-- Function to log provider usage
CREATE OR REPLACE FUNCTION log_provider_usage(
  p_feature TEXT,
  p_user_id UUID,
  p_provider TEXT,
  p_model TEXT,
  p_tokens_input INTEGER DEFAULT 0,
  p_tokens_output INTEGER DEFAULT 0,
  p_cost_usd DECIMAL(10,6) DEFAULT 0.000000,
  p_duration_ms INTEGER DEFAULT 0,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE SQL
AS $$
  INSERT INTO provider_usage_logs (
    feature, user_id, provider, model,
    tokens_input, tokens_output, cost_usd,
    request_duration_ms, success, error_message, metadata
  )
  VALUES (
    p_feature, p_user_id, p_provider, p_model,
    p_tokens_input, p_tokens_output, p_cost_usd,
    p_duration_ms, p_success, p_error_message, p_metadata
  )
  RETURNING id;
$$;