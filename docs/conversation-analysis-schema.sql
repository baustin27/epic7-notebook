-- Conversation Analysis Tables - Story 9.1
-- Add these tables to your Supabase database for AI-powered conversation analysis

-- Main conversation analysis table
CREATE TABLE public.conversation_analysis (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('summary', 'sentiment', 'topics', 'comprehensive')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB, -- Store analysis results
  metadata JSONB, -- Store analysis metadata (tokens used, cost, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(conversation_id, analysis_type)
);

-- Conversation summaries table (for quick access)
CREATE TABLE public.conversation_summaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  summary_text TEXT NOT NULL,
  summary_length TEXT NOT NULL DEFAULT 'medium' CHECK (summary_length IN ('short', 'medium', 'long')),
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Conversation sentiment analysis table
CREATE TABLE public.conversation_sentiment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  overall_sentiment TEXT NOT NULL CHECK (overall_sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
  emotion_distribution JSONB, -- {'joy': 0.3, 'anger': 0.1, 'neutral': 0.6}
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Conversation topics table
CREATE TABLE public.conversation_topics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  topic_name TEXT NOT NULL,
  topic_category TEXT,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  relevance_score DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_conversation_analysis_conversation_id ON public.conversation_analysis(conversation_id);
CREATE INDEX idx_conversation_analysis_user_id ON public.conversation_analysis(user_id);
CREATE INDEX idx_conversation_analysis_status ON public.conversation_analysis(status);
CREATE INDEX idx_conversation_summaries_conversation_id ON public.conversation_summaries(conversation_id);
CREATE INDEX idx_conversation_sentiment_conversation_id ON public.conversation_sentiment(conversation_id);
CREATE INDEX idx_conversation_topics_conversation_id ON public.conversation_topics(conversation_id);
CREATE INDEX idx_conversation_topics_category ON public.conversation_topics(topic_category);

-- Create updated_at triggers
CREATE TRIGGER handle_conversation_analysis_updated_at
  BEFORE UPDATE ON public.conversation_analysis
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_conversation_summaries_updated_at
  BEFORE UPDATE ON public.conversation_summaries
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_conversation_sentiment_updated_at
  BEFORE UPDATE ON public.conversation_sentiment
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_analysis
CREATE POLICY "Users can view their own conversation analysis" ON public.conversation_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation analysis" ON public.conversation_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation analysis" ON public.conversation_analysis
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for conversation_summaries
CREATE POLICY "Users can view their own conversation summaries" ON public.conversation_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation summaries" ON public.conversation_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation summaries" ON public.conversation_summaries
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for conversation_sentiment
CREATE POLICY "Users can view their own conversation sentiment" ON public.conversation_sentiment
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation sentiment" ON public.conversation_sentiment
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation sentiment" ON public.conversation_sentiment
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for conversation_topics
CREATE POLICY "Users can view their own conversation topics" ON public.conversation_topics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation topics" ON public.conversation_topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation topics" ON public.conversation_topics
  FOR UPDATE USING (auth.uid() = user_id);