import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, CONFIG_KEYS } from './admin-config';

describe('Admin Config', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have all required config keys', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('homeowner_pricing');
      expect(DEFAULT_CONFIG).toHaveProperty('diagnostic_fees');
      expect(DEFAULT_CONFIG).toHaveProperty('homeowner_platform_fees');
      expect(DEFAULT_CONFIG).toHaveProperty('provider_fees');
      expect(DEFAULT_CONFIG).toHaveProperty('provider_tiers');
      expect(DEFAULT_CONFIG).toHaveProperty('sponsor_pricing');
      expect(DEFAULT_CONFIG).toHaveProperty('realtor_referral');
      expect(DEFAULT_CONFIG).toHaveProperty('marketplace_payments');
      expect(DEFAULT_CONFIG).toHaveProperty('media_requirements');
      expect(DEFAULT_CONFIG).toHaveProperty('feature_flags');
    });

    it('should have correct homeowner pricing defaults', () => {
      const pricing = DEFAULT_CONFIG.homeowner_pricing;
      expect(pricing.free_homes_limit).toBe(2);
      expect(pricing.additional_home_monthly_cents).toBe(250);
      expect(pricing.tenant_access_monthly_cents).toBe(250);
      expect(pricing.sponsor_free_yearly_cents).toBe(2500);
    });

    it('should have diagnostic fees for all categories', () => {
      const fees = DEFAULT_CONFIG.diagnostic_fees;
      expect(fees.hvac.fee_cents).toBe(8900);
      expect(fees.plumbing.fee_cents).toBe(7900);
      expect(fees.electrical.fee_cents).toBe(8900);
      expect(fees.appliances.fee_cents).toBe(6900);
      expect(fees.landscaping.fee_cents).toBe(0); // No fee for landscaping
    });

    it('should have provider fee configuration', () => {
      const fees = DEFAULT_CONFIG.provider_fees;
      expect(fees.percentage).toBe(8.0);
      expect(fees.minimum_cents).toBe(500);
    });

    it('should have provider tier requirements', () => {
      const tiers = DEFAULT_CONFIG.provider_tiers;
      expect(tiers.verified.monthly_cents).toBe(1000);
      expect(tiers.preferred.monthly_cents).toBe(1500);
      expect(tiers.preferred.requires_verified).toBe(true);
      expect(tiers.preferred.performance_thresholds.min_rating).toBe(4.5);
    });

    it('should have marketplace payment settings', () => {
      const payments = DEFAULT_CONFIG.marketplace_payments;
      expect(payments.estimate_buffer_percentage).toBe(15);
      expect(payments.auto_approve_hours).toBe(24);
      expect(payments.dispute_window_hours).toBe(72);
    });

    it('should have media requirements for all categories', () => {
      const media = DEFAULT_CONFIG.media_requirements;
      expect(media.hvac.min_photos).toBe(2);
      expect(media.exterior.min_photos).toBe(3);
      expect(media.hvac.emergency_exception).toBe(true);
      expect(media.landscaping.emergency_exception).toBe(false);
    });

    it('should have feature flags', () => {
      const flags = DEFAULT_CONFIG.feature_flags;
      expect(flags.ai_intake_enabled).toBe(true);
      expect(flags.sponsor_tiles_enabled).toBe(true);
      expect(flags.marketplace_payments_enabled).toBe(true);
    });
  });

  describe('CONFIG_KEYS', () => {
    it('should have all config key constants', () => {
      expect(CONFIG_KEYS.HOMEOWNER_PRICING).toBe('homeowner_pricing');
      expect(CONFIG_KEYS.DIAGNOSTIC_FEES).toBe('diagnostic_fees');
      expect(CONFIG_KEYS.PROVIDER_FEES).toBe('provider_fees');
      expect(CONFIG_KEYS.MARKETPLACE_PAYMENTS).toBe('marketplace_payments');
    });
  });
});
