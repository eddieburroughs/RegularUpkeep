/**
 * Stripe Integration
 *
 * Exports all Stripe utilities for the RegularUpkeep platform.
 */

// Client
export { getStripe, getStripeForConnect } from "./client";

// Products & Prices
export {
  PRODUCT_IDS,
  PRICE_IDS,
  ensureProduct,
  ensurePrice,
  initializeStripeProducts,
  getPrice,
  listPricesForProduct,
} from "./products";

// Connect (for providers)
export {
  createConnectAccount,
  createOnboardingLink,
  createDashboardLink,
  syncAccountStatus,
  getAccountBalance,
  createPayout,
  transferToProvider,
  getProviderStripeAccount,
} from "./connect";

// Subscriptions
export {
  ensureStripeCustomer,
  createHomeownerCheckoutSession,
  createProviderCheckoutSession,
  createSponsorCheckoutSession,
  createBillingPortalSession,
  getSubscription,
  cancelSubscription,
  updateSubscriptionQuantity,
  pauseSubscription,
  resumeSubscription,
  getPaymentMethods,
  setDefaultPaymentMethod,
  detachPaymentMethod,
} from "./subscriptions";

// Payments
export {
  createDiagnosticFeePayment,
  authorizeEstimate,
  capturePayment,
  cancelAuthorization,
  createRefund,
  reverseTransfer,
  createOneTimePayment,
  getPaymentIntent,
  createSetupIntent,
  createSetupCheckoutSession,
} from "./payments";
