-- ============================================
-- Fix infinite recursion in property_members RLS
-- ============================================

-- Create helper function to check if user is property owner (bypasses RLS)
CREATE OR REPLACE FUNCTION is_property_owner(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM property_members
    WHERE property_id = p_property_id
    AND user_id = auth.uid()
    AND member_role = 'owner'
    AND is_active = true
  );
$$;

-- Create helper function to check if user is property member (bypasses RLS)
CREATE OR REPLACE FUNCTION is_property_member(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM property_members
    WHERE property_id = p_property_id
    AND user_id = auth.uid()
    AND is_active = true
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_property_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_property_member(uuid) TO authenticated;

-- Drop problematic policies
DROP POLICY IF EXISTS "Property owners can view all members" ON property_members;
DROP POLICY IF EXISTS "Property owners can add members" ON property_members;
DROP POLICY IF EXISTS "Users can view property memberships" ON property_members;

-- Recreate policies using helper functions (no recursion)
CREATE POLICY "Users can view own memberships"
ON property_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Property owners can view all members"
ON property_members FOR SELECT
USING (is_property_owner(property_id));

CREATE POLICY "Property owners can add members"
ON property_members FOR INSERT
WITH CHECK (is_property_owner(property_id) OR auth.uid() = user_id);

-- Also fix properties table policies that might have similar issues
DROP POLICY IF EXISTS "Property members can view their properties" ON properties;
DROP POLICY IF EXISTS "Property members can update their properties" ON properties;

CREATE POLICY "Property members can view their properties"
ON properties FOR SELECT
USING (is_property_member(id));

CREATE POLICY "Property members can update their properties"
ON properties FOR UPDATE
USING (is_property_member(id));
