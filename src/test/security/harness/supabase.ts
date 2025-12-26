/**
 * Supabase Client Factory for Security Tests
 *
 * Creates authenticated and anonymous Supabase clients for testing RLS policies.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { SecurityTestEnv } from './env';

export type TestRole = 'homeownerA' | 'homeownerB' | 'provider' | 'handyman' | 'admin';

export interface AuthenticatedClient {
  client: SupabaseClient;
  user: User;
  role: TestRole;
}

/**
 * Create an anonymous (unauthenticated) Supabase client
 */
export function createAnonClient(env: SecurityTestEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a service role client (admin access, bypasses RLS)
 * Use only for test setup and teardown!
 */
export function createServiceClient(env: SecurityTestEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create an authenticated client for a test user
 */
export async function createAuthenticatedClient(
  env: SecurityTestEnv,
  role: TestRole
): Promise<AuthenticatedClient> {
  const credentials = env[role];

  const client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error || !data.user) {
    throw new Error(
      `Failed to authenticate as ${role} (${credentials.email}): ${error?.message || 'No user returned'}`
    );
  }

  return {
    client,
    user: data.user,
    role,
  };
}

/**
 * Sign out an authenticated client
 */
export async function signOut(authClient: AuthenticatedClient): Promise<void> {
  await authClient.client.auth.signOut();
}

/**
 * Create multiple authenticated clients at once
 */
export async function createAllTestClients(
  env: SecurityTestEnv
): Promise<Record<TestRole, AuthenticatedClient>> {
  const [homeownerA, homeownerB, provider, handyman, admin] = await Promise.all([
    createAuthenticatedClient(env, 'homeownerA'),
    createAuthenticatedClient(env, 'homeownerB'),
    createAuthenticatedClient(env, 'provider'),
    createAuthenticatedClient(env, 'handyman'),
    createAuthenticatedClient(env, 'admin'),
  ]);

  return { homeownerA, homeownerB, provider, handyman, admin };
}

/**
 * Sign out all authenticated clients
 */
export async function signOutAll(
  clients: Record<TestRole, AuthenticatedClient>
): Promise<void> {
  await Promise.all(Object.values(clients).map(signOut));
}
