-- Fix RLS infinite recursion by creating helper functions with SECURITY DEFINER
-- These functions bypass RLS when checking cross-table relationships

-- Helper function to check if user is a customer
CREATE OR REPLACE FUNCTION is_customer_profile(p_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM customers
    WHERE id = p_customer_id
    AND profile_id = auth.uid()
  );
$$;

-- Helper function to check if user is a provider
CREATE OR REPLACE FUNCTION is_provider_profile(p_provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM providers
    WHERE id = p_provider_id
    AND profile_id = auth.uid()
  );
$$;

-- Helper function to check if user is a handyman
CREATE OR REPLACE FUNCTION is_handyman_profile(p_handyman_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM handymen
    WHERE id = p_handyman_id
    AND profile_id = auth.uid()
  );
$$;

-- Helper function to get customer_id for current user
CREATE OR REPLACE FUNCTION get_my_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM customers WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- Helper function to get provider_id for current user
CREATE OR REPLACE FUNCTION get_my_provider_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM providers WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- Helper function to check if user has booking relationship with a customer
CREATE OR REPLACE FUNCTION has_booking_with_customer(p_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    JOIN providers p ON p.id = b.provider_id
    WHERE b.customer_id = p_customer_id
    AND p.profile_id = auth.uid()
  );
$$;

-- Helper function to check if user has booking relationship with a provider
CREATE OR REPLACE FUNCTION has_booking_with_provider(p_provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE b.provider_id = p_provider_id
    AND c.profile_id = auth.uid()
  );
$$;

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Providers can view customers for their bookings" ON customers;
DROP POLICY IF EXISTS "Customers can view providers for their bookings" ON providers;

-- Drop old booking policies that have redundant checks
DROP POLICY IF EXISTS "Customers can view their bookings" ON bookings;
DROP POLICY IF EXISTS "Providers can view their bookings" ON bookings;
DROP POLICY IF EXISTS "Handymen can view assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Providers can update their bookings" ON bookings;
DROP POLICY IF EXISTS "Handymen can update assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can read own bookings" ON bookings;
DROP POLICY IF EXISTS "Providers can read own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Providers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;

-- Recreate bookings policies using helper functions (no cross-table RLS triggers)
CREATE POLICY "bookings_select_customer"
ON bookings FOR SELECT
USING (customer_id = get_my_customer_id() OR is_admin());

CREATE POLICY "bookings_select_provider"
ON bookings FOR SELECT
USING (provider_id = get_my_provider_id() OR is_admin());

CREATE POLICY "bookings_select_handyman"
ON bookings FOR SELECT
USING (assigned_tech_user_id = auth.uid() OR is_admin());

CREATE POLICY "bookings_insert_customer"
ON bookings FOR INSERT
WITH CHECK (customer_id = get_my_customer_id() OR is_admin());

CREATE POLICY "bookings_update_customer"
ON bookings FOR UPDATE
USING (customer_id = get_my_customer_id() OR is_admin());

CREATE POLICY "bookings_update_provider"
ON bookings FOR UPDATE
USING (provider_id = get_my_provider_id() OR is_admin());

CREATE POLICY "bookings_update_handyman"
ON bookings FOR UPDATE
USING (assigned_tech_user_id = auth.uid() OR is_admin());

-- Recreate customers policy using helper function
CREATE POLICY "customers_select_for_provider_bookings"
ON customers FOR SELECT
USING (
  profile_id = auth.uid()  -- Own profile
  OR has_booking_with_customer(id)  -- Provider with booking
  OR is_admin()
);

-- Recreate providers policy using helper function
CREATE POLICY "providers_select_for_customer_bookings"
ON providers FOR SELECT
USING (
  profile_id = auth.uid()  -- Own profile
  OR has_booking_with_provider(id)  -- Customer with booking
  OR is_admin()
);

-- Update can_access_property to use helper functions instead of direct queries
CREATE OR REPLACE FUNCTION public.can_access_property(p_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_role user_role;
    v_territory_id UUID;
    v_provider_id UUID;
BEGIN
    -- Get user's role
    SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

    -- Admins can access all properties
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;

    -- Check if user is a property member
    IF EXISTS (
        SELECT 1 FROM property_members
        WHERE property_id = p_property_id
        AND user_id = v_user_id
        AND is_active = true
    ) THEN
        RETURN true;
    END IF;

    -- Territory managers/franchisees can access properties in their territory
    IF v_role IN ('territory_manager', 'franchisee') THEN
        SELECT territory_id INTO v_territory_id
        FROM properties WHERE id = p_property_id;

        IF EXISTS (
            SELECT 1 FROM profiles
            WHERE id = v_user_id
            AND territory_id = v_territory_id
        ) THEN
            RETURN true;
        END IF;
    END IF;

    -- Providers can access properties they have bookings for
    IF v_role = 'provider' THEN
        -- Get provider_id without triggering RLS
        SELECT id INTO v_provider_id FROM providers WHERE profile_id = v_user_id;

        IF v_provider_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM bookings
            WHERE property_id = p_property_id
            AND provider_id = v_provider_id
        ) THEN
            RETURN true;
        END IF;
    END IF;

    -- Handymen can access properties they're assigned to
    IF v_role = 'handyman' THEN
        IF EXISTS (
            SELECT 1 FROM bookings
            WHERE property_id = p_property_id
            AND assigned_tech_user_id = v_user_id
        ) THEN
            RETURN true;
        END IF;
    END IF;

    RETURN false;
END;
$function$;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_customer_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_handyman_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_provider_id() TO authenticated;
GRANT EXECUTE ON FUNCTION has_booking_with_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_booking_with_provider(uuid) TO authenticated;
