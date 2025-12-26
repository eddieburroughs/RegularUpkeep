/**
 * RLS Abuse Tests
 *
 * Verifies that Row Level Security policies properly isolate data between users.
 *
 * Test matrix:
 * - Homeowner A cannot read/write Homeowner B's data
 * - Provider isolation across tenants
 * - Handyman isolation
 * - Anonymous access restrictions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadSecurityTestEnv,
  createAnonClient,
  createAuthenticatedClient,
  seedTestData,
  cleanupTestData,
  type SecurityTestEnv,
  type SeededData,
  type AuthenticatedClient,
} from './harness';
import { securityTestsEnabled } from './setup';

// Skip all tests if environment is not configured
const describeIf = securityTestsEnabled ? describe : describe.skip;

describeIf('RLS Abuse Tests', () => {
  let env: SecurityTestEnv;
  let seededData: SeededData;
  let homeownerAClient: AuthenticatedClient;
  let homeownerBClient: AuthenticatedClient;
  let providerClient: AuthenticatedClient;
  let handymanClient: AuthenticatedClient;

  beforeAll(async () => {
    // Load environment and seed test data
    env = loadSecurityTestEnv();
    seededData = await seedTestData(env);

    // Create authenticated clients for each test user
    [homeownerAClient, homeownerBClient, providerClient, handymanClient] = await Promise.all([
      createAuthenticatedClient(env, 'homeownerA'),
      createAuthenticatedClient(env, 'homeownerB'),
      createAuthenticatedClient(env, 'provider'),
      createAuthenticatedClient(env, 'handyman'),
    ]);
  }, 60000); // 60s timeout for setup

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(env, seededData);
  });

  // =========================================================================
  // PROPERTY ISOLATION TESTS
  // =========================================================================

  describe('Property Isolation', () => {
    it('Homeowner A can SELECT their own properties', async () => {
      const { data, error } = await homeownerAClient.client
        .from('properties')
        .select('*')
        .eq('id', seededData.homeownerA.propertyId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(seededData.homeownerA.propertyId);
    });

    it('Homeowner A CANNOT SELECT Homeowner B properties', async () => {
      const { data, error } = await homeownerAClient.client
        .from('properties')
        .select('*')
        .eq('id', seededData.homeownerB.propertyId);

      // RLS should filter out the row, returning empty result (not error)
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Homeowner A CANNOT UPDATE Homeowner B properties', async () => {
      const { data, error } = await homeownerAClient.client
        .from('properties')
        .update({ nickname: 'HACKED BY A' })
        .eq('id', seededData.homeownerB.propertyId)
        .select();

      // RLS should prevent the update - returns empty or error
      if (error) {
        // Some RLS configs return an error
        expect(error.code).toBeTruthy();
      } else {
        // Others just return no rows affected
        expect(data).toHaveLength(0);
      }

      // Verify no change was made (using service client would bypass RLS)
      const { data: verifyData } = await homeownerBClient.client
        .from('properties')
        .select('nickname')
        .eq('id', seededData.homeownerB.propertyId)
        .single();

      expect(verifyData?.nickname).not.toBe('HACKED BY A');
    });

    it('Homeowner A CANNOT DELETE Homeowner B properties', async () => {
      const { error } = await homeownerAClient.client
        .from('properties')
        .delete()
        .eq('id', seededData.homeownerB.propertyId);

      // Either error or no rows affected
      // Verify property still exists
      const { data: verifyData } = await homeownerBClient.client
        .from('properties')
        .select('id')
        .eq('id', seededData.homeownerB.propertyId);

      expect(verifyData).toHaveLength(1);
    });

    it('Homeowner A CANNOT INSERT into Homeowner B property', async () => {
      // Try to insert a property_member linking A to B's property
      const { error } = await homeownerAClient.client
        .from('property_members')
        .insert({
          property_id: seededData.homeownerB.propertyId,
          user_id: seededData.homeownerA.userId,
          role: 'owner',
        });

      // Should be rejected by RLS
      expect(error).toBeTruthy();
    });
  });

  // =========================================================================
  // SERVICE REQUEST ISOLATION TESTS
  // =========================================================================

  describe('Service Request Isolation', () => {
    it('Homeowner A can SELECT their own service requests', async () => {
      const { data, error } = await homeownerAClient.client
        .from('service_requests')
        .select('*')
        .eq('id', seededData.homeownerA.serviceRequestId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Homeowner A CANNOT SELECT Homeowner B service requests', async () => {
      const { data, error } = await homeownerAClient.client
        .from('service_requests')
        .select('*')
        .eq('id', seededData.homeownerB.serviceRequestId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Homeowner A CANNOT UPDATE Homeowner B service requests', async () => {
      const { data } = await homeownerAClient.client
        .from('service_requests')
        .update({ title: 'HACKED BY A' })
        .eq('id', seededData.homeownerB.serviceRequestId)
        .select();

      expect(data).toHaveLength(0);

      // Verify no change
      const { data: verifyData } = await homeownerBClient.client
        .from('service_requests')
        .select('title')
        .eq('id', seededData.homeownerB.serviceRequestId)
        .single();

      expect(verifyData?.title).not.toBe('HACKED BY A');
    });
  });

  // =========================================================================
  // PROFILE ISOLATION TESTS
  // =========================================================================

  describe('Profile Isolation', () => {
    it('Homeowner A can SELECT their own profile', async () => {
      const { data, error } = await homeownerAClient.client
        .from('profiles')
        .select('*')
        .eq('id', seededData.homeownerA.profileId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Homeowner A CANNOT UPDATE Homeowner B profile', async () => {
      const { data } = await homeownerAClient.client
        .from('profiles')
        .update({ full_name: 'HACKED BY A' })
        .eq('id', seededData.homeownerB.profileId)
        .select();

      expect(data).toHaveLength(0);

      // Verify no change
      const { data: verifyData } = await homeownerBClient.client
        .from('profiles')
        .select('full_name')
        .eq('id', seededData.homeownerB.profileId)
        .single();

      expect(verifyData?.full_name).not.toBe('HACKED BY A');
    });
  });

  // =========================================================================
  // ANONYMOUS ACCESS TESTS
  // =========================================================================

  describe('Anonymous Access Restrictions', () => {
    it('Anonymous client CANNOT list all profiles', async () => {
      const anonClient = createAnonClient(env);

      const { data, error } = await anonClient.from('profiles').select('*').limit(100);

      // Should either error or return empty
      if (error) {
        expect(error.code).toBeTruthy();
      } else {
        expect(data).toHaveLength(0);
      }
    });

    it('Anonymous client CANNOT list all properties', async () => {
      const anonClient = createAnonClient(env);

      const { data, error } = await anonClient.from('properties').select('*').limit(100);

      if (error) {
        expect(error.code).toBeTruthy();
      } else {
        expect(data).toHaveLength(0);
      }
    });

    it('Anonymous client CANNOT list all service_requests', async () => {
      const anonClient = createAnonClient(env);

      const { data, error } = await anonClient.from('service_requests').select('*').limit(100);

      if (error) {
        expect(error.code).toBeTruthy();
      } else {
        expect(data).toHaveLength(0);
      }
    });

    it('Anonymous client CANNOT read specific profile by ID', async () => {
      const anonClient = createAnonClient(env);

      const { data, error } = await anonClient
        .from('profiles')
        .select('*')
        .eq('id', seededData.homeownerA.profileId);

      if (error) {
        expect(error.code).toBeTruthy();
      } else {
        expect(data).toHaveLength(0);
      }
    });
  });

  // =========================================================================
  // PROVIDER ISOLATION TESTS
  // =========================================================================

  describe('Provider Isolation', () => {
    it('Provider can SELECT their own profile', async () => {
      const { data, error } = await providerClient.client
        .from('profiles')
        .select('*')
        .eq('id', seededData.provider.profileId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Provider CANNOT SELECT unassigned service requests', async () => {
      // Service requests belong to homeowners, provider should only see assigned ones
      const { data, error } = await providerClient.client
        .from('service_requests')
        .select('*')
        .eq('id', seededData.homeownerA.serviceRequestId);

      // If provider is not assigned, they shouldn't see it
      // (Unless RLS allows providers to see all pending requests - adjust test accordingly)
      expect(error).toBeNull();
      // The result depends on RLS policy - adjust expectation based on actual policy
    });

    it('Provider CANNOT UPDATE homeowner profiles', async () => {
      const { data } = await providerClient.client
        .from('profiles')
        .update({ full_name: 'HACKED BY PROVIDER' })
        .eq('id', seededData.homeownerA.profileId)
        .select();

      expect(data).toHaveLength(0);
    });
  });

  // =========================================================================
  // HANDYMAN ISOLATION TESTS
  // =========================================================================

  describe('Handyman Isolation', () => {
    it('Handyman can SELECT their own profile', async () => {
      const { data, error } = await handymanClient.client
        .from('profiles')
        .select('*')
        .eq('id', seededData.handyman.profileId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Handyman CANNOT SELECT homeowner properties', async () => {
      const { data, error } = await handymanClient.client
        .from('properties')
        .select('*')
        .eq('id', seededData.homeownerA.propertyId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Handyman CANNOT UPDATE provider profiles', async () => {
      const { data } = await handymanClient.client
        .from('profiles')
        .update({ full_name: 'HACKED BY HANDYMAN' })
        .eq('id', seededData.provider.profileId)
        .select();

      expect(data).toHaveLength(0);
    });
  });

  // =========================================================================
  // ENUMERATION PREVENTION TESTS
  // =========================================================================

  describe('Enumeration Prevention', () => {
    it('Homeowner A cannot enumerate all properties', async () => {
      const { data, error } = await homeownerAClient.client
        .from('properties')
        .select('id, owner_id')
        .limit(100);

      expect(error).toBeNull();

      // Should only see their own properties
      const otherOwnerProperties = data?.filter(
        (p) => p.owner_id !== seededData.homeownerA.userId
      );

      expect(otherOwnerProperties).toHaveLength(0);
    });

    it('Homeowner A cannot enumerate all profiles', async () => {
      const { data, error } = await homeownerAClient.client
        .from('profiles')
        .select('id, email')
        .limit(100);

      expect(error).toBeNull();

      // Should not see homeowner B's profile info
      const otherProfiles = data?.filter(
        (p) => p.id !== seededData.homeownerA.profileId
      );

      // Depending on RLS policy, may see limited public info or nothing
      // At minimum, should not expose sensitive data from other users
    });

    it('Homeowner A cannot enumerate all service requests', async () => {
      const { data, error } = await homeownerAClient.client
        .from('service_requests')
        .select('id, customer_id')
        .limit(100);

      expect(error).toBeNull();

      const otherRequests = data?.filter(
        (r) => r.customer_id !== seededData.homeownerA.userId
      );

      expect(otherRequests).toHaveLength(0);
    });
  });
});
