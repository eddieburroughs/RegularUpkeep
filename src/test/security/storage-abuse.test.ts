/**
 * Storage Bucket Security Tests
 *
 * Verifies that storage bucket policies properly isolate files between users.
 *
 * Tests the `service-request-media` bucket:
 * - User A cannot read User B's files
 * - User A cannot delete User B's files
 * - Anonymous users cannot list or access files
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadSecurityTestEnv,
  createAnonClient,
  createAuthenticatedClient,
  createServiceClient,
  seedTestData,
  cleanupTestData,
  type SecurityTestEnv,
  type SeededData,
  type AuthenticatedClient,
} from './harness';
import { securityTestsEnabled } from './setup';

const BUCKET_NAME = 'service-request-media';

// Skip all tests if environment is not configured
const describeIf = securityTestsEnabled ? describe : describe.skip;

describeIf('Storage Bucket Security Tests', () => {
  let env: SecurityTestEnv;
  let seededData: SeededData;
  let homeownerAClient: AuthenticatedClient;
  let homeownerBClient: AuthenticatedClient;

  // Track uploaded files for cleanup
  const uploadedFiles: { userId: string; path: string }[] = [];

  beforeAll(async () => {
    env = loadSecurityTestEnv();
    seededData = await seedTestData(env);

    [homeownerAClient, homeownerBClient] = await Promise.all([
      createAuthenticatedClient(env, 'homeownerA'),
      createAuthenticatedClient(env, 'homeownerB'),
    ]);

    // Upload test files for each user
    await uploadTestFile(homeownerAClient, seededData.homeownerA.userId, 'test-file-a.txt');
    await uploadTestFile(homeownerBClient, seededData.homeownerB.userId, 'test-file-b.txt');
  }, 60000);

  afterAll(async () => {
    // Clean up uploaded files using service client
    const serviceClient = createServiceClient(env);
    for (const file of uploadedFiles) {
      await serviceClient.storage.from(BUCKET_NAME).remove([file.path]);
    }

    await cleanupTestData(env, seededData);
  });

  /**
   * Helper to upload a test file
   */
  async function uploadTestFile(
    client: AuthenticatedClient,
    userId: string,
    filename: string
  ): Promise<string> {
    const path = `${userId}/${filename}`;
    const content = new Blob([`Test content for ${filename}`], { type: 'text/plain' });

    const { error } = await client.client.storage
      .from(BUCKET_NAME)
      .upload(path, content, { upsert: true });

    if (error) {
      console.warn(`Failed to upload test file ${path}: ${error.message}`);
    } else {
      uploadedFiles.push({ userId, path });
    }

    return path;
  }

  // =========================================================================
  // FILE READ ISOLATION TESTS
  // =========================================================================

  describe('File Read Isolation', () => {
    it('User A can download their own files', async () => {
      const path = `${seededData.homeownerA.userId}/test-file-a.txt`;

      const { data, error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .download(path);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it('User A CANNOT download User B files', async () => {
      const path = `${seededData.homeownerB.userId}/test-file-b.txt`;

      const { data, error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .download(path);

      // Should error or return no data
      expect(error || !data).toBeTruthy();
    });

    it('User A CANNOT list User B folder', async () => {
      const { data, error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .list(seededData.homeownerB.userId);

      // Should error or return empty
      if (error) {
        expect(error.message).toBeTruthy();
      } else {
        expect(data).toHaveLength(0);
      }
    });
  });

  // =========================================================================
  // FILE WRITE ISOLATION TESTS
  // =========================================================================

  describe('File Write Isolation', () => {
    it('User A can upload to their own folder', async () => {
      const path = `${seededData.homeownerA.userId}/write-test-a.txt`;
      const content = new Blob(['Write test content'], { type: 'text/plain' });

      const { error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .upload(path, content);

      if (!error) {
        uploadedFiles.push({ userId: seededData.homeownerA.userId, path });
      }

      expect(error).toBeNull();
    });

    it('User A CANNOT upload to User B folder', async () => {
      const path = `${seededData.homeownerB.userId}/hacked-by-a.txt`;
      const content = new Blob(['Malicious content'], { type: 'text/plain' });

      const { error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .upload(path, content);

      expect(error).toBeTruthy();
    });

    it('User A CANNOT delete User B files', async () => {
      const path = `${seededData.homeownerB.userId}/test-file-b.txt`;

      const { error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .remove([path]);

      // Either error or file still exists
      // Verify file still exists
      const { data } = await homeownerBClient.client.storage
        .from(BUCKET_NAME)
        .download(path);

      expect(data).toBeTruthy();
    });

    it('User A CANNOT overwrite User B files', async () => {
      const path = `${seededData.homeownerB.userId}/test-file-b.txt`;
      const content = new Blob(['HACKED BY A'], { type: 'text/plain' });

      const { error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .update(path, content);

      expect(error).toBeTruthy();
    });
  });

  // =========================================================================
  // ANONYMOUS ACCESS TESTS
  // =========================================================================

  describe('Anonymous Storage Access', () => {
    it('Anonymous client CANNOT list bucket root', async () => {
      const anonClient = createAnonClient(env);

      const { data, error } = await anonClient.storage.from(BUCKET_NAME).list();

      // Should error or return empty
      if (error) {
        expect(error.message).toBeTruthy();
      } else {
        expect(data).toHaveLength(0);
      }
    });

    it('Anonymous client CANNOT list user folders', async () => {
      const anonClient = createAnonClient(env);

      const { data, error } = await anonClient.storage
        .from(BUCKET_NAME)
        .list(seededData.homeownerA.userId);

      if (error) {
        expect(error.message).toBeTruthy();
      } else {
        expect(data).toHaveLength(0);
      }
    });

    it('Anonymous client CANNOT download files', async () => {
      const anonClient = createAnonClient(env);
      const path = `${seededData.homeownerA.userId}/test-file-a.txt`;

      const { data, error } = await anonClient.storage.from(BUCKET_NAME).download(path);

      expect(error || !data).toBeTruthy();
    });

    it('Anonymous client CANNOT upload files', async () => {
      const anonClient = createAnonClient(env);
      const path = `anon-upload/hacked.txt`;
      const content = new Blob(['Anonymous upload attempt'], { type: 'text/plain' });

      const { error } = await anonClient.storage.from(BUCKET_NAME).upload(path, content);

      expect(error).toBeTruthy();
    });
  });

  // =========================================================================
  // SIGNED URL ISOLATION TESTS
  // =========================================================================

  describe('Signed URL Isolation', () => {
    it('User A can create signed URL for their own files', async () => {
      const path = `${seededData.homeownerA.userId}/test-file-a.txt`;

      const { data, error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 60); // 60 seconds

      expect(error).toBeNull();
      expect(data?.signedUrl).toBeTruthy();
    });

    it('User A CANNOT create signed URL for User B files', async () => {
      const path = `${seededData.homeownerB.userId}/test-file-b.txt`;

      const { data, error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 60);

      // Should error
      expect(error).toBeTruthy();
    });
  });

  // =========================================================================
  // MOVE/COPY ISOLATION TESTS
  // =========================================================================

  describe('Move/Copy Isolation', () => {
    it('User A CANNOT move files from User B folder', async () => {
      const fromPath = `${seededData.homeownerB.userId}/test-file-b.txt`;
      const toPath = `${seededData.homeownerA.userId}/stolen-from-b.txt`;

      const { error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .move(fromPath, toPath);

      expect(error).toBeTruthy();

      // Verify original file still exists
      const { data } = await homeownerBClient.client.storage
        .from(BUCKET_NAME)
        .download(`${seededData.homeownerB.userId}/test-file-b.txt`);

      expect(data).toBeTruthy();
    });

    it('User A CANNOT copy files from User B folder', async () => {
      const fromPath = `${seededData.homeownerB.userId}/test-file-b.txt`;
      const toPath = `${seededData.homeownerA.userId}/copied-from-b.txt`;

      const { error } = await homeownerAClient.client.storage
        .from(BUCKET_NAME)
        .copy(fromPath, toPath);

      expect(error).toBeTruthy();
    });
  });
});
