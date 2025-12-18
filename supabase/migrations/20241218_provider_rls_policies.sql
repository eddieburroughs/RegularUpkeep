-- ============================================
-- RLS Policies for Provider Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on all relevant tables (if not already enabled)
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================
-- PROVIDERS TABLE
-- ============================================

-- Providers can read their own provider record
CREATE POLICY "Providers can read own record"
ON providers FOR SELECT
USING (auth.uid() = profile_id);

-- Providers can update their own provider record
CREATE POLICY "Providers can update own record"
ON providers FOR UPDATE
USING (auth.uid() = profile_id);

-- Providers can insert their own provider record (for signup)
CREATE POLICY "Users can create provider record"
ON providers FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- Customers can view provider info for their bookings
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

-- Providers can read bookings assigned to them
CREATE POLICY "Providers can read own bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = bookings.provider_id
    AND p.profile_id = auth.uid()
  )
);

-- Providers can update bookings assigned to them (status, notes, invoice)
CREATE POLICY "Providers can update own bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = bookings.provider_id
    AND p.profile_id = auth.uid()
  )
);

-- Customers can read their own bookings
CREATE POLICY "Customers can read own bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = bookings.customer_id
    AND c.profile_id = auth.uid()
  )
);

-- Customers can create bookings
CREATE POLICY "Customers can create bookings"
ON bookings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = bookings.customer_id
    AND c.profile_id = auth.uid()
  )
);

-- Customers can update their own bookings (cancel, add notes)
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

-- Users can read documents they uploaded
CREATE POLICY "Users can read own uploaded documents"
ON documents FOR SELECT
USING (auth.uid() = uploaded_by);

-- Users can insert documents
CREATE POLICY "Users can upload documents"
ON documents FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
ON documents FOR UPDATE
USING (auth.uid() = uploaded_by);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE
USING (auth.uid() = uploaded_by);

-- Customers can view documents for their properties
CREATE POLICY "Customers can view property documents"
ON documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_members pm
    WHERE pm.property_id = documents.property_id
    AND pm.user_id = auth.uid()
    AND pm.is_active = true
  )
);

-- Users can view documents for bookings they're part of
CREATE POLICY "Users can view booking documents"
ON documents FOR SELECT
USING (
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
);

-- ============================================
-- SERVICES TABLE
-- ============================================

-- Providers can read their own services
CREATE POLICY "Providers can read own services"
ON services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = services.provider_id
    AND p.profile_id = auth.uid()
  )
);

-- Providers can create services
CREATE POLICY "Providers can create services"
ON services FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = services.provider_id
    AND p.profile_id = auth.uid()
  )
);

-- Providers can update their own services
CREATE POLICY "Providers can update own services"
ON services FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = services.provider_id
    AND p.profile_id = auth.uid()
  )
);

-- Providers can delete their own services
CREATE POLICY "Providers can delete own services"
ON services FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = services.provider_id
    AND p.profile_id = auth.uid()
  )
);

-- Customers can view active services (for booking)
CREATE POLICY "Anyone can view active services"
ON services FOR SELECT
USING (is_active = true);

-- ============================================
-- MESSAGE THREADS TABLE
-- ============================================

-- Users can read threads they participate in
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

-- Users can create threads
CREATE POLICY "Users can create threads"
ON message_threads FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update threads they created or participate in
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

-- Users can read messages in threads they participate in
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

-- Users can send messages to threads they participate in
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

-- Users can update their own messages (mark as read)
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

-- Users can see participants in threads they're in
CREATE POLICY "Users can view thread participants"
ON thread_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM thread_participants tp
    WHERE tp.thread_id = thread_participants.thread_id
    AND tp.user_id = auth.uid()
    AND tp.is_active = true
  )
);

-- Thread creators can add participants
CREATE POLICY "Thread creators can add participants"
ON thread_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM message_threads mt
    WHERE mt.id = thread_participants.thread_id
    AND mt.created_by = auth.uid()
  )
);

-- Users can update their own participant record (leave thread)
CREATE POLICY "Users can update own participant record"
ON thread_participants FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- PROPERTIES TABLE (for provider access)
-- ============================================

-- Providers can view property info for their bookings (limited fields via app)
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

-- Property members can view their properties
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

-- Users can read their own customer record
CREATE POLICY "Users can read own customer record"
ON customers FOR SELECT
USING (auth.uid() = profile_id);

-- Users can update their own customer record
CREATE POLICY "Users can update own customer record"
ON customers FOR UPDATE
USING (auth.uid() = profile_id);

-- Users can create their own customer record
CREATE POLICY "Users can create own customer record"
ON customers FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- Providers can view customer info for their bookings
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
-- STORAGE POLICIES (run separately in Storage > Policies)
-- ============================================
-- Note: These need to be created in the Supabase dashboard
-- under Storage > documents bucket > Policies

-- Policy: Providers can upload to their folder
-- Bucket: documents
-- Operation: INSERT
-- Policy: (storage.foldername(name))[1] = 'providers' AND (storage.foldername(name))[2] = (SELECT id::text FROM providers WHERE profile_id = auth.uid())

-- Policy: Users can read their own uploads
-- Bucket: documents
-- Operation: SELECT
-- Policy: auth.uid()::text = (storage.foldername(name))[2] OR owner_id = auth.uid()
