-- Make file columns nullable for inspection documents
-- Inspections store data in meta field, not as file uploads

ALTER TABLE documents ALTER COLUMN file_url DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN file_type DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN file_size DROP NOT NULL;

-- Add comment explaining the schema
COMMENT ON COLUMN documents.file_url IS 'URL to the file. NULL for inspection documents which store data in meta.';
COMMENT ON COLUMN documents.meta IS 'JSON metadata. For inspections: type, sections, findings, summary.';
