-- Migration: Add smart conversation management fields
-- Adds priority detection and archiving functionality for story 9.5

-- Add priority and archiving fields to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS conversations_priority_idx ON conversations(priority);
CREATE INDEX IF NOT EXISTS conversations_archived_idx ON conversations(archived);
CREATE INDEX IF NOT EXISTS conversations_archived_at_idx ON conversations(archived_at);

-- Update existing search function to include priority and archived status
CREATE OR REPLACE FUNCTION search_conversations_semantic(
  query_embedding vector,
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  title text,
  similarity float,
  category text,
  tags text[],
  priority text,
  archived boolean
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.title,
    cosine_similarity(c.embedding, query_embedding) as similarity,
    c.category,
    c.tags,
    c.priority,
    c.archived
  FROM conversations c
  WHERE c.embedding IS NOT NULL
    AND cosine_similarity(c.embedding, query_embedding) > match_threshold
    AND c.archived = false  -- Exclude archived conversations from search by default
  ORDER BY cosine_similarity(c.embedding, query_embedding) DESC
  LIMIT match_count;
$$;

-- Function to automatically determine conversation priority based on content analysis
CREATE OR REPLACE FUNCTION determine_conversation_priority(conv_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  conv_title text;
  message_content text;
  priority text := 'medium';
  urgent_keywords text[] := ARRAY['urgent', 'emergency', 'critical', 'asap', 'deadline', 'breaking'];
  high_keywords text[] := ARRAY['important', 'priority', 'review', 'approval', 'decision'];
  low_keywords text[] := ARRAY['draft', 'idea', 'maybe', 'later', 'eventually'];
BEGIN
  -- Get conversation title
  SELECT title INTO conv_title FROM conversations WHERE id = conv_id;

  -- Get concatenated message content (first 2000 chars for better analysis)
  SELECT string_agg(content, ' ') INTO message_content
  FROM messages
  WHERE conversation_id = conv_id
  LIMIT 20;

  -- Determine priority based on keywords and patterns
  IF conv_title ILIKE ANY(urgent_keywords) OR message_content ILIKE ANY(urgent_keywords) THEN
    priority := 'urgent';
  ELSIF conv_title ILIKE ANY(high_keywords) OR message_content ILIKE ANY(high_keywords) THEN
    priority := 'high';
  ELSIF conv_title ILIKE ANY(low_keywords) OR message_content ILIKE ANY(low_keywords) THEN
    priority := 'low';
  ELSE
    priority := 'medium';
  END IF;

  -- Update the conversation with the determined priority
  UPDATE conversations SET priority = priority WHERE id = conv_id;

  RETURN priority;
END;
$$;

-- Function to automatically archive inactive conversations
CREATE OR REPLACE FUNCTION archive_inactive_conversations(days_inactive int DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Archive conversations that haven't been updated in the specified days
  -- and are not already archived
  UPDATE conversations
  SET
    archived = true,
    archived_at = NOW()
  WHERE
    updated_at < NOW() - INTERVAL '1 day' * days_inactive
    AND archived = false
    AND is_active = true;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

-- Function to unarchive a conversation
CREATE OR REPLACE FUNCTION unarchive_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  success boolean := false;
BEGIN
  UPDATE conversations
  SET
    archived = false,
    archived_at = NULL
  WHERE id = conv_id;

  IF FOUND THEN
    success := true;
  END IF;

  RETURN success;
END;
$$;