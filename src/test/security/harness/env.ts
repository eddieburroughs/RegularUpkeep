/**
 * Environment Configuration for Security Tests
 *
 * Loads and validates environment variables needed for RLS abuse tests.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test if it exists
config({ path: resolve(process.cwd(), '.env.test') });

export interface SecurityTestEnv {
  // Supabase connection
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;

  // Test users
  homeownerA: { email: string; password: string };
  homeownerB: { email: string; password: string };
  provider: { email: string; password: string };
  handyman: { email: string; password: string };
  admin: { email: string; password: string };
}

/**
 * Load environment variables with validation
 */
export function loadSecurityTestEnv(): SecurityTestEnv {
  const missing: string[] = [];

  function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
      return '';
    }
    return value;
  }

  // Supabase credentials - prefer SUPABASE_TEST_* for explicit test targeting
  const supabaseUrl =
    process.env.SUPABASE_TEST_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    process.env.SUPABASE_TEST_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  const supabaseServiceRoleKey =
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (!supabaseUrl) missing.push('SUPABASE_TEST_URL or NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('SUPABASE_TEST_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_TEST_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');

  // Test user credentials
  const homeownerA = {
    email: requireEnv('TEST_HOMEOWNER_A_EMAIL'),
    password: requireEnv('TEST_HOMEOWNER_A_PASSWORD'),
  };

  const homeownerB = {
    email: requireEnv('TEST_HOMEOWNER_B_EMAIL'),
    password: requireEnv('TEST_HOMEOWNER_B_PASSWORD'),
  };

  const provider = {
    email: requireEnv('TEST_PROVIDER_EMAIL'),
    password: requireEnv('TEST_PROVIDER_PASSWORD'),
  };

  const handyman = {
    email: requireEnv('TEST_HANDYMAN_EMAIL'),
    password: requireEnv('TEST_HANDYMAN_PASSWORD'),
  };

  const admin = {
    email: requireEnv('TEST_ADMIN_EMAIL'),
    password: requireEnv('TEST_ADMIN_PASSWORD'),
  };

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for security tests:\n` +
      missing.map((v) => `  - ${v}`).join('\n') +
      `\n\nSee .env.test.example for required variables.`
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    homeownerA,
    homeownerB,
    provider,
    handyman,
    admin,
  };
}

/**
 * Validate that we're not accidentally running against mock values
 */
export function validateRealSupabase(env: SecurityTestEnv): void {
  if (env.supabaseUrl.includes('test.supabase.co')) {
    throw new Error(
      'Security tests require a real Supabase instance.\n' +
      'Set SUPABASE_TEST_URL to your production or staging Supabase URL.'
    );
  }

  if (env.supabaseAnonKey === 'test-anon-key') {
    throw new Error(
      'Security tests require real Supabase credentials.\n' +
      'Set SUPABASE_TEST_ANON_KEY to your real anon key.'
    );
  }

  if (env.supabaseServiceRoleKey === 'test-service-role-key') {
    throw new Error(
      'Security tests require a real service role key for setup.\n' +
      'Set SUPABASE_TEST_SERVICE_ROLE_KEY to your real service role key.'
    );
  }
}
