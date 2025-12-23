/**
 * Stripe Products & Prices
 *
 * Manages Stripe products and prices for:
 * - Homeowner subscriptions (additional homes, tenant access, sponsor-free)
 * - Provider subscriptions (Verified, Preferred tiers)
 * - Sponsor subscriptions
 */

import { getStripe } from "./client";
import type Stripe from "stripe";

// Product IDs (set these in environment after creating products)
export const PRODUCT_IDS = {
  // Homeowner
  HOMEOWNER_ADDITIONAL_HOME: process.env.STRIPE_PRODUCT_ADDITIONAL_HOME,
  HOMEOWNER_TENANT_ACCESS: process.env.STRIPE_PRODUCT_TENANT_ACCESS,
  HOMEOWNER_SPONSOR_FREE: process.env.STRIPE_PRODUCT_SPONSOR_FREE,

  // Provider tiers
  PROVIDER_VERIFIED: process.env.STRIPE_PRODUCT_PROVIDER_VERIFIED,
  PROVIDER_PREFERRED: process.env.STRIPE_PRODUCT_PROVIDER_PREFERRED,

  // Sponsor
  SPONSOR_LOCAL: process.env.STRIPE_PRODUCT_SPONSOR_LOCAL,
};

// Price IDs (set these after creating prices)
export const PRICE_IDS = {
  // Homeowner (monthly)
  HOMEOWNER_ADDITIONAL_HOME_MONTHLY: process.env.STRIPE_PRICE_ADDITIONAL_HOME_MONTHLY,
  HOMEOWNER_TENANT_ACCESS_MONTHLY: process.env.STRIPE_PRICE_TENANT_ACCESS_MONTHLY,
  HOMEOWNER_SPONSOR_FREE_YEARLY: process.env.STRIPE_PRICE_SPONSOR_FREE_YEARLY,

  // Provider (monthly)
  PROVIDER_VERIFIED_MONTHLY: process.env.STRIPE_PRICE_PROVIDER_VERIFIED_MONTHLY,
  PROVIDER_PREFERRED_MONTHLY: process.env.STRIPE_PRICE_PROVIDER_PREFERRED_MONTHLY,

  // Sponsor (yearly)
  SPONSOR_LOCAL_YEARLY: process.env.STRIPE_PRICE_SPONSOR_LOCAL_YEARLY,
};

/**
 * Create or update a Stripe product
 */
export async function ensureProduct(params: {
  id?: string;
  name: string;
  description?: string;
  metadata?: Stripe.MetadataParam;
}): Promise<Stripe.Product> {
  const stripe = getStripe();

  if (params.id) {
    try {
      // Try to retrieve existing product
      const product = await stripe.products.retrieve(params.id);
      // Update if needed
      return await stripe.products.update(params.id, {
        name: params.name,
        description: params.description,
        metadata: params.metadata,
      });
    } catch {
      // Product doesn't exist, create it
    }
  }

  return await stripe.products.create({
    name: params.name,
    description: params.description,
    metadata: params.metadata,
  });
}

/**
 * Create or update a Stripe price
 */
export async function ensurePrice(params: {
  productId: string;
  unitAmount: number;
  currency?: string;
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    interval_count?: number;
  };
  nickname?: string;
  metadata?: Stripe.MetadataParam;
}): Promise<Stripe.Price> {
  const stripe = getStripe();

  // Prices are immutable in Stripe, so we create new ones
  // For updates, you'd archive old price and create new
  return await stripe.prices.create({
    product: params.productId,
    unit_amount: params.unitAmount,
    currency: params.currency || "usd",
    recurring: params.recurring,
    nickname: params.nickname,
    metadata: params.metadata,
  });
}

/**
 * Initialize all required Stripe products and prices
 * Run this once to set up Stripe
 */
export async function initializeStripeProducts(): Promise<{
  products: Record<string, Stripe.Product>;
  prices: Record<string, Stripe.Price>;
}> {
  const stripe = getStripe();

  // Create products
  const products: Record<string, Stripe.Product> = {};

  // Homeowner products
  products.additionalHome = await ensureProduct({
    name: "Additional Home",
    description: "Monthly subscription for additional homes beyond free tier",
    metadata: { type: "homeowner", feature: "additional_home" },
  });

  products.tenantAccess = await ensureProduct({
    name: "Tenant Access",
    description: "Grant tenant access to a property",
    metadata: { type: "homeowner", feature: "tenant_access" },
  });

  products.sponsorFree = await ensureProduct({
    name: "Sponsor-Free Experience",
    description: "Annual subscription for ad-free experience",
    metadata: { type: "homeowner", feature: "sponsor_free" },
  });

  // Provider products
  products.providerVerified = await ensureProduct({
    name: "Verified Provider",
    description: "Monthly subscription for Verified tier providers",
    metadata: { type: "provider", tier: "verified" },
  });

  products.providerPreferred = await ensureProduct({
    name: "Preferred Provider",
    description: "Monthly subscription for Preferred tier providers",
    metadata: { type: "provider", tier: "preferred" },
  });

  // Sponsor products
  products.sponsorLocal = await ensureProduct({
    name: "Local Sponsor",
    description: "Annual local sponsor tile placement",
    metadata: { type: "sponsor" },
  });

  // Create prices
  const prices: Record<string, Stripe.Price> = {};

  // Homeowner prices (using defaults from admin config)
  prices.additionalHomeMonthly = await ensurePrice({
    productId: products.additionalHome.id,
    unitAmount: 250, // $2.50/month
    recurring: { interval: "month" },
    nickname: "Additional Home - Monthly",
  });

  prices.tenantAccessMonthly = await ensurePrice({
    productId: products.tenantAccess.id,
    unitAmount: 250, // $2.50/month
    recurring: { interval: "month" },
    nickname: "Tenant Access - Monthly",
  });

  prices.sponsorFreeYearly = await ensurePrice({
    productId: products.sponsorFree.id,
    unitAmount: 2500, // $25/year
    recurring: { interval: "year" },
    nickname: "Sponsor-Free - Yearly",
  });

  // Provider prices
  prices.providerVerifiedMonthly = await ensurePrice({
    productId: products.providerVerified.id,
    unitAmount: 1000, // $10/month
    recurring: { interval: "month" },
    nickname: "Verified Provider - Monthly",
  });

  prices.providerPreferredMonthly = await ensurePrice({
    productId: products.providerPreferred.id,
    unitAmount: 1500, // $15/month
    recurring: { interval: "month" },
    nickname: "Preferred Provider - Monthly",
  });

  // Sponsor prices
  prices.sponsorLocalYearly = await ensurePrice({
    productId: products.sponsorLocal.id,
    unitAmount: 25000, // $250/year
    recurring: { interval: "year" },
    nickname: "Local Sponsor - Yearly",
  });

  console.log("Stripe products and prices initialized:");
  console.log("Products:", Object.keys(products).map((k) => `${k}: ${products[k].id}`));
  console.log("Prices:", Object.keys(prices).map((k) => `${k}: ${prices[k].id}`));

  return { products, prices };
}

/**
 * Get a price by its ID
 */
export async function getPrice(priceId: string): Promise<Stripe.Price> {
  const stripe = getStripe();
  return await stripe.prices.retrieve(priceId);
}

/**
 * List active prices for a product
 */
export async function listPricesForProduct(
  productId: string
): Promise<Stripe.Price[]> {
  const stripe = getStripe();
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
  });
  return prices.data;
}
