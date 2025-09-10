-- Analytics Schema for Enterprise Readiness
-- Run this in Supabase SQL Editor to add analytics tables

-- Add role to users table for admin access
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Analytics Events Table - Track all user interactions
CREATE TABLE public.analytics_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'login', 'message_sent', 'conversation_created', 'model_changed', etc.
  event_data JSONB DEFAULT '{}', -- Additional event-specific data
  session_id TEXT, -- For tracking user sessions
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Analytics Metrics Table - Aggregated daily metrics
CREATE TABLE public.analytics_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'daily_active_users', 'total_messages', 'total_conversations', etc.
  metric_value BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(date, metric_type)
);

-- Model Performance Table - Track AI model usage and performance
CREATE TABLE public.model_performance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  response_time_ms INTEGER, -- Response time in milliseconds
  cost_cents INTEGER, -- Cost in cents (for billing)
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- User Engagement Table - Track user activity patterns
CREATE TABLE public.user_engagement (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  conversations_created INTEGER DEFAULT 0,
  session_duration_minutes INTEGER DEFAULT 0,
  models_used TEXT[], -- Array of models used that day
  features_used TEXT[], -- Array of features used
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_metrics_date ON public.analytics_metrics(date DESC);
CREATE INDEX idx_analytics_metrics_type ON public.analytics_metrics(metric_type);
CREATE INDEX idx_model_performance_user_id ON public.model_performance(user_id);
CREATE INDEX idx_model_performance_model ON public.model_performance(model);
CREATE INDEX idx_model_performance_created_at ON public.model_performance(created_at DESC);
CREATE INDEX idx_user_engagement_user_id ON public.user_engagement(user_id);
CREATE INDEX idx_user_engagement_date ON public.user_engagement(date DESC);

-- Create updated_at trigger for user_engagement
CREATE TRIGGER handle_user_engagement_updated_at
  BEFORE UPDATE ON public.user_engagement
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view analytics data
CREATE POLICY "Admins can view analytics events" ON public.analytics_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view analytics metrics" ON public.analytics_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view model performance" ON public.model_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view user engagement" ON public.user_engagement
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can view their own engagement data
CREATE POLICY "Users can view their own engagement" ON public.user_engagement
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own model performance
CREATE POLICY "Users can view their own model performance" ON public.model_performance
  FOR SELECT USING (auth.uid() = user_id);

-- Function to update user engagement metrics
CREATE OR REPLACE FUNCTION public.update_user_engagement(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_engagement (user_id, date, last_activity)
  VALUES (p_user_id, p_date, NOW())
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    last_activity = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION public.aggregate_daily_metrics(p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS VOID AS $$
BEGIN
  -- Daily Active Users
  INSERT INTO public.analytics_metrics (date, metric_type, metric_value)
  SELECT p_date, 'daily_active_users', COUNT(DISTINCT user_id)
  FROM public.analytics_events
  WHERE DATE(created_at) = p_date AND event_type = 'login'
  ON CONFLICT (date, metric_type) DO UPDATE SET metric_value = EXCLUDED.metric_value;

  -- Total Messages
  INSERT INTO public.analytics_metrics (date, metric_type, metric_value)
  SELECT p_date, 'total_messages', COUNT(*)
  FROM public.messages
  WHERE DATE(created_at) = p_date
  ON CONFLICT (date, metric_type) DO UPDATE SET metric_value = EXCLUDED.metric_value;

  -- Total Conversations
  INSERT INTO public.analytics_metrics (date, metric_type, metric_value)
  SELECT p_date, 'total_conversations', COUNT(*)
  FROM public.conversations
  WHERE DATE(created_at) = p_date
  ON CONFLICT (date, metric_type) DO UPDATE SET metric_value = EXCLUDED.metric_value;

  -- Total Users
  INSERT INTO public.analytics_metrics (date, metric_type, metric_value)
  SELECT p_date, 'total_users', COUNT(*)
  FROM public.users
  WHERE DATE(created_at) <= p_date
  ON CONFLICT (date, metric_type) DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;