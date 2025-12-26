/**
 * API Route Authorization Tests (Optional)
 *
 * Verifies that Next.js API routes properly check authentication
 * and authorization before processing requests.
 *
 * These tests make HTTP requests to the running API endpoints.
 * They require the app to be running (e.g., via `npm run dev`).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadSecurityTestEnv,
  createAuthenticatedClient,
  seedTestData,
  cleanupTestData,
  type SecurityTestEnv,
  type SeededData,
  type AuthenticatedClient,
} from './harness';

// Skip these tests by default - they require a running server
const SKIP_API_TESTS = process.env.RUN_API_TESTS !== 'true';

describe.skipIf(SKIP_API_TESTS)('API Route Authorization Tests', () => {
  let env: SecurityTestEnv;
  let seededData: SeededData;
  let homeownerAClient: AuthenticatedClient;
  let homeownerBClient: AuthenticatedClient;

  // Get base URL from environment
  const baseUrl = process.env.API_TEST_BASE_URL || 'http://localhost:3002';

  beforeAll(async () => {
    env = loadSecurityTestEnv();
    seededData = await seedTestData(env);

    [homeownerAClient, homeownerBClient] = await Promise.all([
      createAuthenticatedClient(env, 'homeownerA'),
      createAuthenticatedClient(env, 'homeownerB'),
    ]);
  }, 60000);

  afterAll(async () => {
    await cleanupTestData(env, seededData);
  });

  /**
   * Helper to get auth headers for a client
   */
  async function getAuthHeaders(client: AuthenticatedClient): Promise<HeadersInit> {
    const { data: { session } } = await client.client.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    };
  }

  // =========================================================================
  // UNAUTHENTICATED ACCESS TESTS
  // =========================================================================

  describe('Unauthenticated Access Rejection', () => {
    it('GET /api/properties rejects unauthenticated requests', async () => {
      const response = await fetch(`${baseUrl}/api/properties`);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('GET /api/service-requests rejects unauthenticated requests', async () => {
      const response = await fetch(`${baseUrl}/api/service-requests`);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('POST /api/properties rejects unauthenticated requests', async () => {
      const response = await fetch(`${baseUrl}/api/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_line1: '123 Hacker St',
          city: 'Hackerville',
          state: 'NC',
          zip_code: '27601',
        }),
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // =========================================================================
  // CROSS-USER ACCESS TESTS
  // =========================================================================

  describe('Cross-User Access Prevention', () => {
    it('User A cannot fetch User B property via API', async () => {
      const headers = await getAuthHeaders(homeownerAClient);

      const response = await fetch(
        `${baseUrl}/api/properties/${seededData.homeownerB.propertyId}`,
        { headers }
      );

      // Should be 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot update User B property via API', async () => {
      const headers = await getAuthHeaders(homeownerAClient);

      const response = await fetch(
        `${baseUrl}/api/properties/${seededData.homeownerB.propertyId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ nickname: 'HACKED BY A' }),
        }
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot delete User B property via API', async () => {
      const headers = await getAuthHeaders(homeownerAClient);

      const response = await fetch(
        `${baseUrl}/api/properties/${seededData.homeownerB.propertyId}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot fetch User B service request via API', async () => {
      const headers = await getAuthHeaders(homeownerAClient);

      const response = await fetch(
        `${baseUrl}/api/service-requests/${seededData.homeownerB.serviceRequestId}`,
        { headers }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  // =========================================================================
  // ADMIN-ONLY ROUTE TESTS
  // =========================================================================

  describe('Admin-Only Route Protection', () => {
    it('Regular user cannot access /api/admin/* routes', async () => {
      const headers = await getAuthHeaders(homeownerAClient);

      const response = await fetch(`${baseUrl}/api/admin/users`, { headers });

      expect([401, 403, 404]).toContain(response.status);
    });

    it('Regular user cannot access /api/admin/config', async () => {
      const headers = await getAuthHeaders(homeownerAClient);

      const response = await fetch(`${baseUrl}/api/admin/config`, { headers });

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  // =========================================================================
  // CRON ROUTE PROTECTION TESTS
  // =========================================================================

  describe('Cron Route Protection', () => {
    it('Cron routes reject requests without CRON_SECRET', async () => {
      const response = await fetch(`${baseUrl}/api/cron/process-transfers`, {
        method: 'POST',
      });

      expect([401, 403]).toContain(response.status);
    });

    it('Cron routes reject requests with invalid CRON_SECRET', async () => {
      const response = await fetch(`${baseUrl}/api/cron/process-transfers`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-secret',
        },
      });

      expect([401, 403]).toContain(response.status);
    });
  });
});
