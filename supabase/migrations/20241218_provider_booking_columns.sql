-- ============================================
-- Migration: Add Provider & Booking Columns
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- ============================================
-- ENUM TYPES
-- ============================================

-- Create travel_status enum if not exists
DO $$ BEGIN
    CREATE TYPE travel_status AS ENUM ('none', 'on_my_way', 'arrived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create verification_status enum if not exists
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- BOOKINGS TABLE - New Columns
-- ============================================

-- travel_status: Track provider's journey to the job
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS travel_status travel_status DEFAULT 'none';

-- completion_notes: Provider's notes when completing job
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS completion_notes text;

-- invoice_items: Line items for the invoice (jsonb array)
-- Format: [{ id, description, quantity, unit_price_cents }]
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS invoice_items jsonb DEFAULT '[]'::jsonb;

-- invoice_cents: Computed total from invoice_items
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS invoice_cents integer DEFAULT 0;

-- job_photos: Before/after photos (jsonb array of URLs)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS job_photos jsonb DEFAULT '[]'::jsonb;

-- actual_start_time: When provider started the job
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS actual_start_time timestamptz;

-- actual_end_time: When provider completed the job
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS actual_end_time timestamptz;

-- ============================================
-- PROVIDERS TABLE - New Columns
-- ============================================

-- contact_name: Primary contact person
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS contact_name text;

-- phone: Business phone number
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS phone text;

-- email: Business email
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS email text;

-- is_online: Provider availability toggle
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- verification_status: Document verification state
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified';

-- service_categories: Array of service categories provider offers
-- Format: ["hvac", "plumbing", "electrical", ...]
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS service_categories jsonb DEFAULT '[]'::jsonb;

-- service_area: Provider's service coverage area
-- Format: { type: "radius", zip_code: "12345", radius_miles: 25 }
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS service_area jsonb DEFAULT '{}'::jsonb;

-- ============================================
-- INDEXES for performance
-- ============================================

-- Index for finding bookings by travel status
CREATE INDEX IF NOT EXISTS idx_bookings_travel_status
ON bookings(travel_status)
WHERE travel_status != 'none';

-- Index for finding online providers
CREATE INDEX IF NOT EXISTS idx_providers_is_online
ON providers(is_online)
WHERE is_online = true;

-- Index for provider verification status
CREATE INDEX IF NOT EXISTS idx_providers_verification_status
ON providers(verification_status);

-- Index for bookings by provider and status (for provider dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status
ON bookings(provider_id, status, scheduled_date);

-- ============================================
-- COMMENTS for documentation
-- ============================================

COMMENT ON COLUMN bookings.travel_status IS 'Provider journey status: none, on_my_way, arrived';
COMMENT ON COLUMN bookings.completion_notes IS 'Provider notes added when completing the job';
COMMENT ON COLUMN bookings.invoice_items IS 'Line items array: [{id, description, quantity, unit_price_cents}]';
COMMENT ON COLUMN bookings.invoice_cents IS 'Total invoice amount in cents, computed from invoice_items';
COMMENT ON COLUMN bookings.job_photos IS 'Array of photo URLs for before/after documentation';

COMMENT ON COLUMN providers.is_online IS 'Whether provider is currently accepting jobs';
COMMENT ON COLUMN providers.verification_status IS 'Document verification: unverified, pending, verified';
COMMENT ON COLUMN providers.service_categories IS 'Array of maintenance categories provider services';
COMMENT ON COLUMN providers.service_area IS 'Service coverage: {type, zip_code, radius_miles}';

-- ============================================
-- VERIFICATION
-- ============================================

-- Check bookings columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('travel_status', 'completion_notes', 'invoice_items', 'invoice_cents', 'job_photos', 'actual_start_time', 'actual_end_time')
ORDER BY column_name;

-- Check providers columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'providers'
AND column_name IN ('contact_name', 'phone', 'email', 'is_online', 'verification_status', 'service_categories', 'service_area')
ORDER BY column_name;
