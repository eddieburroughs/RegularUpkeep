/**
 * Security Test Setup
 *
 * Validates environment before running RLS abuse tests.
 * If environment is not configured, tests will be skipped.
 */

import { loadSecurityTestEnv, validateRealSupabase } from './harness/env';

// Track if environment is valid for security tests
export let securityTestsEnabled = false;
export let envError: Error | null = null;

// Validate environment on module load
try {
  const env = loadSecurityTestEnv();
  validateRealSupabase(env);
  securityTestsEnabled = true;
  console.log(`[Security Tests] Using Supabase at: ${env.supabaseUrl}`);
} catch (error) {
  envError = error as Error;
  console.error('[Security Tests] Setup failed:', (error as Error).message);
  console.error('[Security Tests] Tests will be skipped. See .env.test.example for required variables.');
}
