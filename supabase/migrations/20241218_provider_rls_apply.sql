-- ============================================
-- RLS Policies for Provider Tables
-- Safe to run multiple times (drops existing policies first)
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on all tables
ALTER TABLE IF EXISTS providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Providers
DROP POLICY IF EXISTS "Providers can read own record" ON providers;
DROP POLICY IF EXISTS "Providers can update own record" ON providers;
DROP POLICY IF EXISTS "Users can create provider record" ON providers;
DROP POLICY IF EXISTS "Customers can view providers for their bookings" ON providers;

-- Bookings
DROP POLICY IF EXISTS "Providers can read own bookings" ON bookings;
DROP POLICY IF EXISTS "Providers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can read own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can update own bookings" ON bookings;

-- Documents
DROP POLICY IF EXISTS "Users can read own uploaded documents" ON documents;
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP POLICY IF EXISTS "Customers can view property documents" ON documents;
DROP POLICY IF EXISTS "Users can view booking documents" ON documents;

-- Services
DROP POLICY IF EXISTS "Providers can read own services" ON services;
DROP POLICY IF EXISTS "Providers can create services" ON services;
DROP POLICY IF EXISTS "Providers can update own services" ON services;
DROP POLICY IF EXISTS "Providers can delete own services" ON services;
DROP POLICY IF EXISTS "Anyone can view active services" ON services;

-- Message threads
DROP POLICY IF EXISTS "Users can read threads they participate in" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads" ON message_threads;
DROP POLICY IF EXISTS "Users can update threads they participate in" ON message_threads;

-- Messages
DROP POLICY IF EXISTS "Users can read messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their threads" ON messages;
DROP POLICY IF EXISTS "Users can update message read status" ON messages;

-- Thread participants
DROP POLICY IF EXISTS "Users can view thread participants" ON thread_participants;
DROP POLICY IF EXISTS "Thread creators can add participants" ON thread_participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON thread_participants;

-- Properties
DROP POLICY IF EXISTS "Providers can view properties for their bookings" ON properties;
DROP POLICY IF EXISTS "Property members can view their properties" ON properties;

-- Customers
DROP POLICY IF EXISTS "Users can read own customer record" ON customers;
DROP POLICY IF EXISTS "Users can update own customer record" ON customers;
DROP POLICY IF EXISTS "Users can create own customer record" ON customers;
DROP POLICY IF EXISTS "Providers can view customers for their bookings" ON customers;

-- ============================================
-- PROFILES TABLE
-- ============================================

CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================
-- PROVIDERS TABLE
-- ============================================

CREATE POLICY "Providers can read own record"
ON providers FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Providers can update own record"
ON providers FOR UPDATE
USING (auth.uid() = profile_id);

CREATE POLICY "Users can create provider record"
ON providers FOR INSERT
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Customers can view providers for their bookings"
ON providers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN customers c ON b.customer_id = c.id
    WHERE b.provider_id = providers.id
    AND c.profile_id = auth.uid()
  )
);

-- ============================================
-- BOOKINGS TABLE
-- ============================================

CREATE POLICY "Providers can read own bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = bookings.provider_id
    AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Providers can update own bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = bookings.provider_id
    AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Customers can read own bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = bookings.customer_id
    AND c.profile_id = auth.uid()
  )
);

CREATE POLICY "Customers can create bookings"
ON bookings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = bookings.customer_id
    AND c.profile_id = auth.uid()
  )
);

CREATE POLICY "Customers can update own bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = bookings.customer_id
    AND c.profile_id = auth.uid()
  )
);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================

CREATE POLICY "Users can read own uploaded documents"
ON documents FOR SELECT
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can upload documents"
ON documents FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own documents"
ON documents FOR UPDATE
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE
USING (auth.uid() = uploaded_by);

CREATE POLICY "Customers can view property documents"
ON documents FOR SELECT
USING (
  property_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM property_members pm
    WHERE pm.property_id = documents.property_id
    AND pm.user_id = auth.uid()
    AND pm.is_active = true
  )
);

CREATE POLICY "Users can view booking documents"
ON documents FOR SELECT
USING (
  booking_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE b.id = documents.booking_id
      AND c.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN providers p ON b.provider_id = p.id
      WHERE b.id = documents.booking_id
      AND p.profile_id = auth.uid()
    )
  )
);

-- ============================================
-- SERVICES TABLE
-- ============================================

CREATE POLICY "Providers can read own services"
ON services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = services.provider_id
    AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Providers can create services"
ON services FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = services.provider_id
    AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Providers can update own services"
ON services FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = services.provider_id
    AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete own services"
ON services FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = services.provider_id
    AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view active services"
ON services FOR SELECT
USING (is_active = true);

-- ============================================
-- MESSAGE THREADS TABLE
-- ============================================

CREATE POLICY "Users can read threads they participate in"
ON message_threads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM thread_participants tp
    WHERE tp.thread_id = message_threads.id
    AND tp.user_id = auth.uid()
    AND tp.is_active = true
  )
);

CREATE POLICY "Users can create threads"
ON message_threads FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update threads they participate in"
ON message_threads FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM thread_participants tp
    WHERE tp.thread_id = message_threads.id
    AND tp.user_id = auth.uid()
    AND tp.is_active = true
  )
);

-- ============================================
-- MESSAGES TABLE
-- ============================================

CREATE POLICY "Users can read messages in their threads"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM thread_participants tp
    WHERE tp.thread_id = messages.thread_id
    AND tp.user_id = auth.uid()
    AND tp.is_active = true
  )
);

CREATE POLICY "Users can send messages to their threads"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM thread_participants tp
    WHERE tp.thread_id = messages.thread_id
    AND tp.user_id = auth.uid()
    AND tp.is_active = true
  )
);

CREATE POLICY "Users can update message read status"
ON messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM thread_participants tp
    WHERE tp.thread_id = messages.thread_id
    AND tp.user_id = auth.uid()
    AND tp.is_active = true
  )
);

-- ============================================
-- THREAD PARTICIPANTS TABLE
-- ============================================

CREATE POLICY "Users can view thread participants"
ON thread_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM thread_participants tp2
    WHERE tp2.thread_id = thread_participants.thread_id
    AND tp2.user_id = auth.uid()
    AND tp2.is_active = true
  )
);

CREATE POLICY "Thread creators can add participants"
ON thread_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM message_threads mt
    WHERE mt.id = thread_participants.thread_id
    AND mt.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update own participant record"
ON thread_participants FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- PROPERTIES TABLE
-- ============================================

CREATE POLICY "Providers can view properties for their bookings"
ON properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN providers p ON b.provider_id = p.id
    WHERE b.property_id = properties.id
    AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Property members can view their properties"
ON properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_members pm
    WHERE pm.property_id = properties.id
    AND pm.user_id = auth.uid()
    AND pm.is_active = true
  )
);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================

CREATE POLICY "Users can read own customer record"
ON customers FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own customer record"
ON customers FOR UPDATE
USING (auth.uid() = profile_id);

CREATE POLICY "Users can create own customer record"
ON customers FOR INSERT
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Providers can view customers for their bookings"
ON customers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN providers p ON b.provider_id = p.id
    WHERE b.customer_id = customers.id
    AND p.profile_id = auth.uid()
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Run this to verify policies were created:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
