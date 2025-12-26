# RegularUpkeep Security Testing Guide

This document explains how to run the RLS (Row Level Security) abuse tests to verify data isolation between tenants.

## Overview

The security test suite verifies that:
1. **Homeowner isolation**: Homeowner A cannot read/write Homeowner B's data
2. **Provider isolation**: Providers can only see jobs assigned to them
3. **Handyman isolation**: Handymen can only see their assigned tasks
4. **Storage security**: Users cannot access each other's uploaded files
5. **No list-all leakage**: Public/anon clients cannot enumerate all rows

## Prerequisites

1. **Node.js 20+** and npm
2. **Supabase instance** (production, staging, or local)
3. **Service role key** (for test setup/teardown only)

## Setup

### 1. Create Test Environment File

```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your values:
- `SUPABASE_TEST_URL` - Your Supabase API URL
- `SUPABASE_TEST_ANON_KEY` - Public anon key
- `SUPABASE_TEST_SERVICE_ROLE_KEY` - Service role key (admin)
- Test user credentials (unique emails for test users)

### 2. Test Against Production (Recommended for CI)

For true security validation, test against your production RLS policies:

```env
SUPABASE_TEST_URL=https://api.regularupkeep.com
SUPABASE_TEST_ANON_KEY=eyJ...your_anon_key...
SUPABASE_TEST_SERVICE_ROLE_KEY=eyJ...your_service_role_key...
```

**Warning**: Tests create and delete test data. Use unique test user emails to avoid conflicts.

### 3. Test Against Local Supabase (Optional)

If you have Supabase CLI installed:

```bash
# Start local Supabase
supabase start

# Get credentials
supabase status
```

Use the local credentials in `.env.test`:

```env
SUPABASE_TEST_URL=http://localhost:54321
SUPABASE_TEST_ANON_KEY=<local_anon_key>
SUPABASE_TEST_SERVICE_ROLE_KEY=<local_service_role_key>
```

## Running Tests

### Run RLS Security Tests Only

```bash
npm run test:rls
```

Or the alias:

```bash
npm run test:security:rls
```

### Run All Tests (Including Security)

```bash
npm run test:all
```

### Run with Verbose Output

```bash
npm run test:rls -- --reporter=verbose
```

## Test Structure

```
src/test/security/
├── setup.ts              # Environment validation
├── harness/
│   ├── env.ts            # Environment loader
│   ├── supabase.ts       # Client factory
│   └── seed.ts           # Test data seeding
├── rls-abuse.test.ts     # RLS isolation tests
└── storage-abuse.test.ts # Storage bucket tests
```

## What the Tests Verify

### RLS Abuse Tests (`rls-abuse.test.ts`)

| Test | Description |
|------|-------------|
| Homeowner A cannot SELECT Homeowner B's properties | Cross-tenant read isolation |
| Homeowner A cannot UPDATE Homeowner B's properties | Cross-tenant write isolation |
| Homeowner A cannot SELECT Homeowner B's service_requests | Request isolation |
| Provider cannot SELECT unassigned jobs | Provider job isolation |
| Handyman cannot SELECT other handymen's tasks | Handyman task isolation |
| Anon client cannot list all profiles | No enumeration without auth |
| Anon client cannot list all properties | No public property listing |

### Storage Abuse Tests (`storage-abuse.test.ts`)

| Test | Description |
|------|-------------|
| User A cannot read User B's uploaded files | Storage read isolation |
| User A cannot delete User B's files | Storage write isolation |
| Anon cannot list bucket contents | No public enumeration |

## CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/security.yml
name: Security Tests
on: [push, pull_request]

jobs:
  rls-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:rls
        env:
          SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
          SUPABASE_TEST_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
          SUPABASE_TEST_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_TEST_SERVICE_ROLE_KEY }}
          TEST_HOMEOWNER_A_EMAIL: test-homeowner-a@regularupkeep-test.local
          TEST_HOMEOWNER_A_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          # ... other test user credentials
```

## Troubleshooting

### "Missing required environment variables"

Ensure all variables in `.env.test.example` are set in `.env.test`.

### "Invalid API key"

Check that your keys are correct and not expired.

### "Test user already exists"

Tests use idempotent user creation. If you see conflicts, ensure test emails are unique.

### "RLS policy not working as expected"

1. Check the migration files in `supabase/migrations/`
2. Verify policies are applied: `SELECT * FROM pg_policies`
3. Test queries directly in Supabase SQL Editor

## Security Notes

- **Never commit `.env.test`** - it contains the service role key
- **Use test-specific emails** - avoid `@test.com` (some systems block it)
- **Run on staging first** - before testing against production
- **Clean up after tests** - the harness deletes test data, but verify manually

## Adding New Tests

1. Add test cases to existing files or create new `.test.ts` files in `src/test/security/`
2. Use the harness functions for client creation and seeding
3. Follow the pattern: setup user A, setup user B, verify A cannot access B's data
4. Clean up test data in `afterAll()`
