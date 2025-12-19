-- Provider Team Management Tables
-- This migration creates tables for managing provider employees/team members

-- ============================================
-- 1. PROVIDER_MEMBERS TABLE
-- Links employees (handymen) to providers
-- ============================================

CREATE TABLE IF NOT EXISTS provider_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('owner', 'manager', 'technician')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  invited_by UUID REFERENCES profiles(id),
  invite_id UUID, -- Will reference provider_invites after that table is created
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only be a member of a provider once
  UNIQUE(provider_id, profile_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_provider_members_provider ON provider_members(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_members_profile ON provider_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_provider_members_status ON provider_members(status);

-- ============================================
-- 2. PROVIDER_INVITES TABLE
-- Tracks invite codes/links for employees
-- ============================================

CREATE TABLE IF NOT EXISTS provider_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  email TEXT, -- Optional: if inviting a specific email
  role TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('manager', 'technician')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ, -- NULL means never expires
  max_uses INTEGER DEFAULT 1, -- How many times this invite can be used (NULL = unlimited)
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast invite code lookups
CREATE INDEX IF NOT EXISTS idx_provider_invites_code ON provider_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_provider_invites_provider ON provider_invites(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_invites_email ON provider_invites(email) WHERE email IS NOT NULL;

-- Add foreign key from provider_members to provider_invites
ALTER TABLE provider_members
  ADD CONSTRAINT fk_provider_members_invite
  FOREIGN KEY (invite_id) REFERENCES provider_invites(id) ON DELETE SET NULL;

-- ============================================
-- 3. UPDATE HANDYMEN TABLE
-- Add provider_id to link handymen to their employer
-- ============================================

ALTER TABLE handymen
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_handymen_provider ON handymen(provider_id) WHERE provider_id IS NOT NULL;

-- ============================================
-- 4. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Trigger function (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for provider_members
DROP TRIGGER IF EXISTS update_provider_members_updated_at ON provider_members;
CREATE TRIGGER update_provider_members_updated_at
  BEFORE UPDATE ON provider_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for provider_invites
DROP TRIGGER IF EXISTS update_provider_invites_updated_at ON provider_invites;
CREATE TRIGGER update_provider_invites_updated_at
  BEFORE UPDATE ON provider_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE provider_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_invites ENABLE ROW LEVEL SECURITY;

-- Provider Members Policies
-- Providers can see their own team members
CREATE POLICY "Providers can view their team members"
  ON provider_members FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
    OR profile_id = auth.uid()
  );

-- Providers can add team members to their own provider
CREATE POLICY "Providers can add team members"
  ON provider_members FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  );

-- Providers can update their own team members
CREATE POLICY "Providers can update team members"
  ON provider_members FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  );

-- Providers can remove team members
CREATE POLICY "Providers can delete team members"
  ON provider_members FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  );

-- Provider Invites Policies
-- Providers can see their own invites
CREATE POLICY "Providers can view their invites"
  ON provider_invites FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  );

-- Anyone can view an invite by code (for signup flow)
CREATE POLICY "Anyone can view invite by code"
  ON provider_invites FOR SELECT
  USING (is_active = TRUE);

-- Providers can create invites for their own provider
CREATE POLICY "Providers can create invites"
  ON provider_invites FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  );

-- Providers can update their own invites
CREATE POLICY "Providers can update invites"
  ON provider_invites FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  );

-- Providers can delete their own invites
CREATE POLICY "Providers can delete invites"
  ON provider_invites FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  );

-- ============================================
-- 6. HELPER FUNCTION TO USE INVITE
-- ============================================

CREATE OR REPLACE FUNCTION use_provider_invite(
  p_invite_code TEXT,
  p_profile_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_invite provider_invites%ROWTYPE;
  v_provider providers%ROWTYPE;
  v_member_id UUID;
BEGIN
  -- Get the invite
  SELECT * INTO v_invite
  FROM provider_invites
  WHERE invite_code = p_invite_code
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR use_count < max_uses);

  IF v_invite.id IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'Invalid or expired invite code');
  END IF;

  -- Get the provider
  SELECT * INTO v_provider
  FROM providers
  WHERE id = v_invite.provider_id;

  IF v_provider.id IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'Provider not found');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM provider_members
    WHERE provider_id = v_invite.provider_id AND profile_id = p_profile_id
  ) THEN
    RETURN json_build_object('success', FALSE, 'error', 'Already a member of this provider');
  END IF;

  -- Create the membership
  INSERT INTO provider_members (provider_id, profile_id, role, status, invite_id, joined_at)
  VALUES (v_invite.provider_id, p_profile_id, v_invite.role, 'active', v_invite.id, NOW())
  RETURNING id INTO v_member_id;

  -- Update invite use count
  UPDATE provider_invites
  SET use_count = use_count + 1,
      updated_at = NOW()
  WHERE id = v_invite.id;

  -- Update user's role to handyman if not already
  UPDATE profiles
  SET role = 'handyman'
  WHERE id = p_profile_id AND role = 'customer';

  -- Create or update handyman record
  INSERT INTO handymen (profile_id, provider_id, is_available)
  VALUES (p_profile_id, v_invite.provider_id, TRUE)
  ON CONFLICT (profile_id)
  DO UPDATE SET provider_id = v_invite.provider_id, updated_at = NOW();

  RETURN json_build_object(
    'success', TRUE,
    'member_id', v_member_id,
    'provider_id', v_invite.provider_id,
    'provider_name', v_provider.business_name,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION use_provider_invite(TEXT, UUID) TO authenticated;

-- ============================================
-- 7. AUTO-CREATE OWNER MEMBERSHIP
-- When a provider is created, auto-add the creator as owner
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_provider_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO provider_members (provider_id, profile_id, role, status, joined_at)
  VALUES (NEW.id, NEW.profile_id, 'owner', 'active', NOW())
  ON CONFLICT (provider_id, profile_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_provider_owner ON providers;
CREATE TRIGGER trigger_auto_create_provider_owner
  AFTER INSERT ON providers
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_provider_owner();

-- ============================================
-- 8. BACKFILL: Add owner membership for existing providers
-- ============================================

INSERT INTO provider_members (provider_id, profile_id, role, status, joined_at)
SELECT id, profile_id, 'owner', 'active', created_at
FROM providers
ON CONFLICT (provider_id, profile_id) DO NOTHING;
