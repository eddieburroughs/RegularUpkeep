-- ============================================
-- Migration: Add meta column to documents table
-- For storing inspection report data and export info
-- ============================================

-- Add meta column for inspection data
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Add 'inspection' to document_category enum if not exists
DO $$
BEGIN
    ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'inspection';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Index for querying inspection documents
CREATE INDEX IF NOT EXISTS idx_documents_category_property
ON documents(category, property_id)
WHERE category = 'inspection';

-- Comment
COMMENT ON COLUMN documents.meta IS 'JSON metadata for inspection reports, export info, etc.';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'documents' AND column_name = 'meta';
