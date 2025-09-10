-- Create prompts table for user-managed prompt library
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    is_custom BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS prompts_user_id_idx ON public.prompts(user_id);
CREATE INDEX IF NOT EXISTS prompts_category_idx ON public.prompts(category);
CREATE INDEX IF NOT EXISTS prompts_created_at_idx ON public.prompts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own prompts
CREATE POLICY "Users can view their own prompts" ON public.prompts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own prompts
CREATE POLICY "Users can create their own prompts" ON public.prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own prompts
CREATE POLICY "Users can update their own prompts" ON public.prompts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own prompts
CREATE POLICY "Users can delete their own prompts" ON public.prompts
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_prompts_updated_at
    BEFORE UPDATE ON public.prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();