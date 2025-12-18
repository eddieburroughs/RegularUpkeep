-- ============================================
-- RLS Policies for Customer Property Creation
-- Fixes: "new row violates row-level security policy for table properties"
-- ============================================

-- Enable RLS on property_members if not already enabled
ALTER TABLE IF EXISTS property_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROPERTIES TABLE - Missing INSERT/UPDATE policies
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create properties" ON properties;
DROP POLICY IF EXISTS "Property members can update their properties" ON properties;

-- Allow authenticated users to create properties
CREATE POLICY "Users can create properties"
ON properties FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow property members to update their properties
CREATE POLICY "Property members can update their properties"
ON properties FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM property_members pm
    WHERE pm.property_id = properties.id
    AND pm.user_id = auth.uid()
    AND pm.is_active = true
  )
);

-- ============================================
-- PROPERTY_MEMBERS TABLE - Missing policies
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can add themselves as property member" ON property_members;
DROP POLICY IF EXISTS "Users can view property memberships" ON property_members;
DROP POLICY IF EXISTS "Property owners can manage members" ON property_members;

-- Allow users to add themselves as property members (for initial property creation)
CREATE POLICY "Users can add themselves as property member"
ON property_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view property memberships they're part of
CREATE POLICY "Users can view property memberships"
ON property_members FOR SELECT
USING (auth.uid() = user_id);

-- Allow property owners to view all members of their properties
CREATE POLICY "Property owners can view all members"
ON property_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_members pm2
    WHERE pm2.property_id = property_members.property_id
    AND pm2.user_id = auth.uid()
    AND pm2.member_role = 'owner'
    AND pm2.is_active = true
  )
);

-- Allow property owners to add other members
CREATE POLICY "Property owners can add members"
ON property_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM property_members pm
    WHERE pm.property_id = property_members.property_id
    AND pm.user_id = auth.uid()
    AND pm.member_role = 'owner'
    AND pm.is_active = true
  )
);

-- Allow users to update their own membership (e.g., leave property)
CREATE POLICY "Users can update own membership"
ON property_members FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify policies were created:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('properties', 'property_members');
