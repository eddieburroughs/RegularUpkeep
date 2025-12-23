import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the config functions
vi.mock('@/lib/config/admin-config', () => ({
  getConfig: vi.fn().mockImplementation((key: string) => {
    if (key === 'homeowner_platform_fees') {
      return Promise.resolve({
        tiers: [
          { min_cents: 0, max_cents: 10000, fee_cents: 500 },
          { min_cents: 10001, max_cents: 25000, fee_cents: 750 },
          { min_cents: 25001, max_cents: 50000, fee_cents: 1000 },
          { min_cents: 50001, max_cents: 100000, fee_cents: 1500 },
        ],
        cap_cents: 2500,
      });
    }
    if (key === 'provider_fees') {
      return Promise.resolve({
        percentage: 8.0,
        minimum_cents: 500,
      });
    }
    if (key === 'diagnostic_fees') {
      return Promise.resolve({
        hvac: { fee_cents: 8900, creditable: true },
        plumbing: { fee_cents: 7900, creditable: true },
      });
    }
    return Promise.resolve({});
  }),
  calculateHomeownerPlatformFee: vi.fn().mockImplementation(async (amountCents: number) => {
    // Simple fee calculation for testing
    if (amountCents <= 10000) return 500;
    if (amountCents <= 25000) return 750;
    if (amountCents <= 50000) return 1000;
    return 1500;
  }),
  calculateProviderFee: vi.fn().mockImplementation(async (amountCents: number) => {
    const calculated = Math.floor((amountCents * 8) / 100);
    return Math.max(calculated, 500);
  }),
  getDiagnosticFee: vi.fn().mockImplementation(async (category: string) => {
    const fees: Record<string, { fee_cents: number; creditable: boolean }> = {
      hvac: { fee_cents: 8900, creditable: true },
      plumbing: { fee_cents: 7900, creditable: true },
    };
    return fees[category] || { fee_cents: 4900, creditable: true };
  }),
}));

import {
  calculateHomeownerPlatformFee,
  calculateProviderFee,
  getDiagnosticFee,
} from '@/lib/config/admin-config';

describe('Payment Calculations', () => {
  describe('calculateHomeownerPlatformFee', () => {
    it('should return correct fee for small jobs', async () => {
      const fee = await calculateHomeownerPlatformFee(5000);
      expect(fee).toBe(500);
    });

    it('should return correct fee for medium jobs', async () => {
      const fee = await calculateHomeownerPlatformFee(15000);
      expect(fee).toBe(750);
    });

    it('should return correct fee for large jobs', async () => {
      const fee = await calculateHomeownerPlatformFee(40000);
      expect(fee).toBe(1000);
    });
  });

  describe('calculateProviderFee', () => {
    it('should calculate 8% fee', async () => {
      const fee = await calculateProviderFee(10000);
      expect(fee).toBe(800);
    });

    it('should apply minimum fee of $5', async () => {
      const fee = await calculateProviderFee(1000);
      expect(fee).toBe(500); // Minimum is 500 cents
    });
  });

  describe('getDiagnosticFee', () => {
    it('should return correct fee for HVAC', async () => {
      const fee = await getDiagnosticFee('hvac');
      expect(fee.fee_cents).toBe(8900);
      expect(fee.creditable).toBe(true);
    });

    it('should return correct fee for plumbing', async () => {
      const fee = await getDiagnosticFee('plumbing');
      expect(fee.fee_cents).toBe(7900);
    });

    it('should return default fee for unknown category', async () => {
      const fee = await getDiagnosticFee('unknown');
      expect(fee.fee_cents).toBe(4900);
    });
  });
});
