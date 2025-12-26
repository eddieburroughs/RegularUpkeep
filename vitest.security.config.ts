import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for RLS security tests.
 *
 * These tests run against a real Supabase instance to verify Row Level Security
 * policies are working correctly. They require environment variables to be set.
 *
 * See README_TESTING_SECURITY.md for setup instructions.
 */
export default defineConfig({
  test: {
    // Use node environment - we're making real API calls, not rendering React
    environment: 'node',

    // Security tests are in src/test/security/
    include: ['src/test/security/**/*.{test,spec}.ts'],

    // Longer timeout for API calls
    testTimeout: 30000,

    // Run tests sequentially to avoid race conditions
    sequence: {
      concurrent: false,
    },
    maxConcurrency: 1,

    // Don't use globals - explicit imports for clarity
    globals: false,

    // Setup file for environment validation
    setupFiles: ['./src/test/security/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
