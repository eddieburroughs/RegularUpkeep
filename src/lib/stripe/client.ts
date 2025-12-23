/**
 * Stripe Server-Side Client
 *
 * Creates authenticated Stripe instances for server-side operations.
 */

import Stripe from "stripe";

// Singleton instance
let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe client instance
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    stripeInstance = new Stripe(secretKey, {
      typescript: true,
      appInfo: {
        name: "RegularUpkeep",
        version: "1.0.0",
      },
    });
  }

  return stripeInstance;
}

/**
 * Create a Stripe instance for a specific Connect account
 */
export function getStripeForConnect(stripeAccountId: string): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    stripeAccount: stripeAccountId,
  });
}

// Export types
export type { Stripe };
