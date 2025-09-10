-- Create automation_workflows table for user-managed automation templates
CREATE TABLE IF NOT EXISTS public.automation_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('pattern', 'keyword', 'context', 'manual')),
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create conversation_patterns table for detected repetitive patterns
CREATE TABLE IF NOT EXISTS public.conversation_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('repetitive_question', 'common_response', 'workflow_sequence', 'context_pattern')),
    pattern_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    detection_count INTEGER DEFAULT 1,
    last_detected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create workflow_executions table for tracking automation usage
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    trigger_data JSONB NOT NULL DEFAULT '{}',
    actions_executed JSONB NOT NULL DEFAULT '[]',
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS automation_workflows_user_id_idx ON public.automation_workflows(user_id);
CREATE INDEX IF NOT EXISTS automation_workflows_trigger_type_idx ON public.automation_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS automation_workflows_is_active_idx ON public.automation_workflows(is_active);
CREATE INDEX IF NOT EXISTS automation_workflows_priority_idx ON public.automation_workflows(priority DESC);

CREATE INDEX IF NOT EXISTS conversation_patterns_user_id_idx ON public.conversation_patterns(user_id);
CREATE INDEX IF NOT EXISTS conversation_patterns_pattern_type_idx ON public.conversation_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS conversation_patterns_confidence_score_idx ON public.conversation_patterns(confidence_score DESC);
CREATE INDEX IF NOT EXISTS conversation_patterns_is_active_idx ON public.conversation_patterns(is_active);

CREATE INDEX IF NOT EXISTS workflow_executions_user_id_idx ON public.workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS workflow_executions_workflow_id_idx ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_executions_conversation_id_idx ON public.workflow_executions(conversation_id);
CREATE INDEX IF NOT EXISTS workflow_executions_created_at_idx ON public.workflow_executions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for automation_workflows
CREATE POLICY "Users can view their own automation workflows" ON public.automation_workflows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own automation workflows" ON public.automation_workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation workflows" ON public.automation_workflows
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation workflows" ON public.automation_workflows
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for conversation_patterns
CREATE POLICY "Users can view their own conversation patterns" ON public.conversation_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation patterns" ON public.conversation_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation patterns" ON public.conversation_patterns
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation patterns" ON public.conversation_patterns
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for workflow_executions
CREATE POLICY "Users can view their own workflow executions" ON public.workflow_executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflow executions" ON public.workflow_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create triggers to automatically update updated_at
CREATE TRIGGER handle_automation_workflows_updated_at
    BEFORE UPDATE ON public.automation_workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_conversation_patterns_updated_at
    BEFORE UPDATE ON public.conversation_patterns
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();