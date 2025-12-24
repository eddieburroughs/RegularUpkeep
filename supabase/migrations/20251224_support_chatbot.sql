-- ============================================================
-- RegularUpkeep Support Chatbot Database Schema
-- Migration: 20251224_support_chatbot
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- 1. Add support_code to profiles table
-- ============================================================

-- Add support_code columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS support_code text UNIQUE,
ADD COLUMN IF NOT EXISTS support_code_created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS support_code_rotated_at timestamptz;

-- Create index for support code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_support_code ON profiles(support_code);

-- Function to generate support code (RU-XXXXXX-XXXX format)
-- Avoids ambiguous characters: I, O, 1, 0
CREATE OR REPLACE FUNCTION generate_support_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'RU-';
  i integer;
BEGIN
  -- Generate first 6 characters
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  result := result || '-';
  -- Generate last 4 characters
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger function to auto-generate support code on insert
CREATE OR REPLACE FUNCTION trigger_generate_support_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  attempts integer := 0;
BEGIN
  IF NEW.support_code IS NULL THEN
    LOOP
      new_code := generate_support_code();
      BEGIN
        NEW.support_code := new_code;
        NEW.support_code_created_at := now();
        RETURN NEW;
      EXCEPTION WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts > 10 THEN
          RAISE EXCEPTION 'Could not generate unique support code after 10 attempts';
        END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new profiles
DROP TRIGGER IF EXISTS tr_profiles_support_code ON profiles;
CREATE TRIGGER tr_profiles_support_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_support_code();

-- Backfill existing profiles missing support_code
UPDATE profiles
SET
  support_code = generate_support_code(),
  support_code_created_at = now()
WHERE support_code IS NULL;

-- ============================================================
-- 2. Conversations table
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('web', 'app')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'escalated', 'closed')),
  public_token_hash text,
  identity_state jsonb DEFAULT '{"status": "pending"}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_public_token ON conversations(public_token_hash) WHERE public_token_hash IS NOT NULL;

-- ============================================================
-- 3. Messages table
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'bot', 'agent')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================================
-- 4. Leads table
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  role text CHECK (role IS NULL OR role IN ('homeowner', 'provider', 'handyman', 'pm', 'investor', 'unknown')),
  city text,
  properties_count integer,
  pain_point text,
  consent_contact boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'app')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ============================================================
-- 5. Support Tickets table
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  support_code text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('billing', 'login', 'booking', 'inspection', 'provider', 'bug', 'feature', 'other')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'waiting_on_user', 'resolved', 'closed')),
  summary text NOT NULL,
  details text,
  links jsonb DEFAULT '{}'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER tr_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- ============================================================
-- 6. KB Articles table
-- ============================================================

CREATE TABLE IF NOT EXISTS kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  tags text[] DEFAULT '{}',
  role_visibility text NOT NULL DEFAULT 'all' CHECK (role_visibility IN ('all', 'homeowner', 'provider', 'handyman', 'admin')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  source_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON kb_articles(status, role_visibility);
CREATE INDEX IF NOT EXISTS idx_kb_articles_tags ON kb_articles USING gin(tags);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_articles_source_path ON kb_articles(source_path) WHERE source_path IS NOT NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_kb_articles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_kb_articles_updated_at ON kb_articles;
CREATE TRIGGER tr_kb_articles_updated_at
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_articles_updated_at();

-- ============================================================
-- 7. KB Article Chunks table (for RAG)
-- ============================================================

CREATE TABLE IF NOT EXISTS kb_article_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  token_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_article_chunks_article_id ON kb_article_chunks(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_article_chunks_embedding ON kb_article_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 8. Audit Log table
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- ============================================================
-- 9. Chat Rate Limits table
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('ip', 'user_id', 'public_token')),
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_identifier ON chat_rate_limits(identifier, identifier_type, window_start);

-- ============================================================
-- 10. RLS Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Service role bypass for conversations" ON conversations;
CREATE POLICY "Service role bypass for conversations" ON conversations
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user_id = auth.uid() OR is_admin())
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON messages;
CREATE POLICY "Users can insert messages in own conversations" ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user_id = auth.uid() OR conversations.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Service role bypass for messages" ON messages;
CREATE POLICY "Service role bypass for messages" ON messages
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Leads policies (insert public, read admin only)
DROP POLICY IF EXISTS "Anyone can insert leads" ON leads;
CREATE POLICY "Anyone can insert leads" ON leads
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view leads" ON leads;
CREATE POLICY "Admins can view leads" ON leads
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update leads" ON leads;
CREATE POLICY "Admins can update leads" ON leads
  FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Service role bypass for leads" ON leads;
CREATE POLICY "Service role bypass for leads" ON leads
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Support tickets policies
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can insert tickets" ON support_tickets;
CREATE POLICY "Users can insert tickets" ON support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;
CREATE POLICY "Admins can update tickets" ON support_tickets
  FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Service role bypass for tickets" ON support_tickets;
CREATE POLICY "Service role bypass for tickets" ON support_tickets
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- KB articles policies (published public, drafts admin only)
DROP POLICY IF EXISTS "Anyone can view published articles" ON kb_articles;
CREATE POLICY "Anyone can view published articles" ON kb_articles
  FOR SELECT
  USING (status = 'published' OR is_admin());

DROP POLICY IF EXISTS "Admins can manage articles" ON kb_articles;
CREATE POLICY "Admins can manage articles" ON kb_articles
  FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Service role bypass for kb_articles" ON kb_articles;
CREATE POLICY "Service role bypass for kb_articles" ON kb_articles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- KB chunks policies (follow article visibility)
DROP POLICY IF EXISTS "Anyone can view published chunks" ON kb_article_chunks;
CREATE POLICY "Anyone can view published chunks" ON kb_article_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kb_articles
      WHERE kb_articles.id = kb_article_chunks.article_id
      AND (kb_articles.status = 'published' OR is_admin())
    )
  );

DROP POLICY IF EXISTS "Service role bypass for chunks" ON kb_article_chunks;
CREATE POLICY "Service role bypass for chunks" ON kb_article_chunks
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Audit log policies (admin only)
DROP POLICY IF EXISTS "Admins can view audit log" ON audit_log;
CREATE POLICY "Admins can view audit log" ON audit_log
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Service role bypass for audit_log" ON audit_log;
CREATE POLICY "Service role bypass for audit_log" ON audit_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Rate limits (service role only)
DROP POLICY IF EXISTS "Service role only for rate limits" ON chat_rate_limits;
CREATE POLICY "Service role only for rate limits" ON chat_rate_limits
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- 11. Vector similarity search function
-- ============================================================

CREATE OR REPLACE FUNCTION search_kb_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 5,
  match_threshold float DEFAULT 0.7,
  user_role text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  article_id uuid,
  article_title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.article_id,
    ka.title AS article_title,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM kb_article_chunks kc
  JOIN kb_articles ka ON ka.id = kc.article_id
  WHERE ka.status = 'published'
    AND (ka.role_visibility = 'all' OR ka.role_visibility = user_role OR user_role = 'admin')
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 12. Storage bucket for chat attachments
-- ============================================================

-- Note: Run this in Supabase dashboard or via management API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chat-attachments', 'chat-attachments', false)
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE conversations IS 'Support chatbot conversations';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE leads IS 'Pre-sales leads captured from public chat';
COMMENT ON TABLE support_tickets IS 'Escalated support tickets';
COMMENT ON TABLE kb_articles IS 'Knowledge base articles for RAG';
COMMENT ON TABLE kb_article_chunks IS 'Chunked and embedded KB content for vector search';
COMMENT ON TABLE audit_log IS 'Security and compliance audit trail';
