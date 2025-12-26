/**
 * Test Data Seeding for Security Tests
 *
 * Creates test users and data needed for RLS abuse testing.
 * Uses service role to bypass RLS for setup.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { SecurityTestEnv } from './env';
import { createServiceClient } from './supabase';

export interface SeededData {
  homeownerA: {
    userId: string;
    profileId: string;
    propertyId: string;
    serviceRequestId?: string;
  };
  homeownerB: {
    userId: string;
    profileId: string;
    propertyId: string;
    serviceRequestId?: string;
  };
  provider: {
    userId: string;
    profileId: string;
    providerId?: string;
  };
  handyman: {
    userId: string;
    profileId: string;
  };
  admin: {
    userId: string;
    profileId: string;
  };
}

/**
 * Ensure a test user exists and has the correct role
 */
async function ensureTestUser(
  serviceClient: SupabaseClient,
  email: string,
  password: string,
  role: 'customer' | 'provider' | 'handyman' | 'admin',
  fullName: string
): Promise<{ userId: string; profileId: string }> {
  // Check if user already exists
  const { data: existingUser } = await serviceClient.auth.admin.listUsers();
  const existing = existingUser?.users?.find((u) => u.email === email);

  let userId: string;

  if (existing) {
    userId = existing.id;
  } else {
    // Create the user
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      throw new Error(`Failed to create test user ${email}: ${createError?.message}`);
    }

    userId = newUser.user.id;
  }

  // Ensure profile exists with correct role
  const { error: upsertError } = await serviceClient
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role,
      },
      { onConflict: 'id' }
    );

  if (upsertError) {
    throw new Error(`Failed to upsert profile for ${email}: ${upsertError.message}`);
  }

  return { userId, profileId: userId };
}

/**
 * Create a property owned by a user
 */
async function createTestProperty(
  serviceClient: SupabaseClient,
  ownerId: string,
  nickname: string
): Promise<string> {
  const { data, error } = await serviceClient
    .from('properties')
    .insert({
      owner_id: ownerId,
      nickname,
      address_line1: `123 Test St - ${nickname}`,
      city: 'Test City',
      state: 'NC',
      zip_code: '27601',
      property_type: 'single_family',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create property for ${nickname}: ${error?.message}`);
  }

  return data.id;
}

/**
 * Create a service request for a property
 */
async function createTestServiceRequest(
  serviceClient: SupabaseClient,
  customerId: string,
  propertyId: string,
  title: string
): Promise<string> {
  // Generate a unique request number
  const requestNumber = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  const { data, error } = await serviceClient
    .from('service_requests')
    .insert({
      customer_id: customerId,
      property_id: propertyId,
      request_number: requestNumber,
      title,
      description: `Test service request: ${title}`,
      category: 'plumbing',
      urgency: 'standard',
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create service request: ${error?.message}`);
  }

  return data.id;
}

/**
 * Seed all test data needed for RLS abuse testing
 */
export async function seedTestData(env: SecurityTestEnv): Promise<SeededData> {
  const serviceClient = createServiceClient(env);

  // Create all test users
  const [homeownerAUser, homeownerBUser, providerUser, handymanUser, adminUser] = await Promise.all([
    ensureTestUser(serviceClient, env.homeownerA.email, env.homeownerA.password, 'customer', 'Test Homeowner A'),
    ensureTestUser(serviceClient, env.homeownerB.email, env.homeownerB.password, 'customer', 'Test Homeowner B'),
    ensureTestUser(serviceClient, env.provider.email, env.provider.password, 'provider', 'Test Provider'),
    ensureTestUser(serviceClient, env.handyman.email, env.handyman.password, 'handyman', 'Test Handyman'),
    ensureTestUser(serviceClient, env.admin.email, env.admin.password, 'admin', 'Test Admin'),
  ]);

  // Create properties for homeowners
  const [propertyAId, propertyBId] = await Promise.all([
    createTestProperty(serviceClient, homeownerAUser.userId, 'Homeowner A Property'),
    createTestProperty(serviceClient, homeownerBUser.userId, 'Homeowner B Property'),
  ]);

  // Create service requests
  const [serviceRequestAId, serviceRequestBId] = await Promise.all([
    createTestServiceRequest(serviceClient, homeownerAUser.userId, propertyAId, 'Homeowner A Request'),
    createTestServiceRequest(serviceClient, homeownerBUser.userId, propertyBId, 'Homeowner B Request'),
  ]);

  return {
    homeownerA: {
      userId: homeownerAUser.userId,
      profileId: homeownerAUser.profileId,
      propertyId: propertyAId,
      serviceRequestId: serviceRequestAId,
    },
    homeownerB: {
      userId: homeownerBUser.userId,
      profileId: homeownerBUser.profileId,
      propertyId: propertyBId,
      serviceRequestId: serviceRequestBId,
    },
    provider: {
      userId: providerUser.userId,
      profileId: providerUser.profileId,
    },
    handyman: {
      userId: handymanUser.userId,
      profileId: handymanUser.profileId,
    },
    admin: {
      userId: adminUser.userId,
      profileId: adminUser.profileId,
    },
  };
}

/**
 * Clean up test data (properties and service requests only, keep users)
 */
export async function cleanupTestData(env: SecurityTestEnv, seededData: SeededData): Promise<void> {
  const serviceClient = createServiceClient(env);

  // Delete service requests first (foreign key constraint)
  const requestIds = [seededData.homeownerA.serviceRequestId, seededData.homeownerB.serviceRequestId].filter(Boolean);
  if (requestIds.length > 0) {
    await serviceClient.from('service_requests').delete().in('id', requestIds);
  }

  // Delete properties
  const propertyIds = [seededData.homeownerA.propertyId, seededData.homeownerB.propertyId];
  await serviceClient.from('properties').delete().in('id', propertyIds);
}

/**
 * Full cleanup including test users (use sparingly)
 */
export async function cleanupAllTestData(env: SecurityTestEnv): Promise<void> {
  const serviceClient = createServiceClient(env);

  const testEmails = [
    env.homeownerA.email,
    env.homeownerB.email,
    env.provider.email,
    env.handyman.email,
    env.admin.email,
  ];

  // Get user IDs
  const { data: users } = await serviceClient.auth.admin.listUsers();
  const testUserIds = users?.users
    ?.filter((u) => testEmails.includes(u.email || ''))
    ?.map((u) => u.id) || [];

  if (testUserIds.length === 0) return;

  // Delete related data first (order matters due to foreign keys)
  await serviceClient.from('service_requests').delete().in('customer_id', testUserIds);
  await serviceClient.from('properties').delete().in('owner_id', testUserIds);
  await serviceClient.from('profiles').delete().in('id', testUserIds);

  // Delete auth users
  for (const userId of testUserIds) {
    await serviceClient.auth.admin.deleteUser(userId);
  }
}
