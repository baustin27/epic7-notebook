-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS embedding vector(1536), -- OpenAI text-embedding-ada-002 dimension
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS search_score float;

-- Add embedding columns to messages table for message-level search
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp with time zone;

-- Create vector indexes for efficient similarity search
CREATE INDEX IF NOT EXISTS conversations_embedding_idx
ON conversations USING ivfflat (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_embedding_idx
ON messages USING ivfflat (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Create indexes for category and tags search
CREATE INDEX IF NOT EXISTS conversations_category_idx ON conversations(category);
CREATE INDEX IF NOT EXISTS conversations_tags_idx ON conversations USING gin(tags);
CREATE INDEX IF NOT EXISTS conversations_search_score_idx ON conversations(search_score);

-- Function to calculate cosine similarity
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT 1 - (a <=> b);
$$;

-- Function to search conversations by semantic similarity
CREATE OR REPLACE FUNCTION search_conversations_semantic(
  query_embedding vector,
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  title text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.title,
    cosine_similarity(c.embedding, query_embedding) as similarity
  FROM conversations c
  WHERE c.embedding IS NOT NULL
    AND cosine_similarity(c.embedding, query_embedding) > match_threshold
  ORDER BY cosine_similarity(c.embedding, query_embedding) DESC
  LIMIT match_count;
$$;

-- Function to search messages by semantic similarity
CREATE OR REPLACE FUNCTION search_messages_semantic(
  query_embedding vector,
  conversation_id_filter uuid DEFAULT NULL,
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  conversation_id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.conversation_id,
    m.content,
    cosine_similarity(m.embedding, query_embedding) as similarity
  FROM messages m
  WHERE m.embedding IS NOT NULL
    AND cosine_similarity(m.embedding, query_embedding) > match_threshold
    AND (conversation_id_filter IS NULL OR m.conversation_id = conversation_id_filter)
  ORDER BY cosine_similarity(m.embedding, query_embedding) DESC
  LIMIT match_count;
$$;

-- Function to categorize conversations based on content patterns
CREATE OR REPLACE FUNCTION categorize_conversation(conv_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  conv_title text;
  message_content text;
  category text;
BEGIN
  -- Get conversation title
  SELECT title INTO conv_title FROM conversations WHERE id = conv_id;

  -- Get concatenated message content (first 1000 chars)
  SELECT string_agg(content, ' ') INTO message_content
  FROM messages
  WHERE conversation_id = conv_id
  LIMIT 10;

  -- Simple rule-based categorization (can be enhanced with AI)
  IF conv_title ILIKE '%bug%' OR conv_title ILIKE '%error%' OR conv_title ILIKE '%fix%' THEN
    category := 'bug_fix';
  ELSIF conv_title ILIKE '%feature%' OR conv_title ILIKE '%implement%' THEN
    category := 'feature_development';
  ELSIF conv_title ILIKE '%question%' OR conv_title ILIKE '%help%' THEN
    category := 'support_question';
  ELSIF conv_title ILIKE '%design%' OR conv_title ILIKE '%ui%' OR conv_title ILIKE '%ux%' THEN
    category := 'design_discussion';
  ELSIF message_content ILIKE '%code review%' OR message_content ILIKE '%pr%' THEN
    category := 'code_review';
  ELSE
    category := 'general_discussion';
  END IF;

  -- Update the conversation with the category
  UPDATE conversations SET category = category WHERE id = conv_id;

  RETURN category;
END;
$$;