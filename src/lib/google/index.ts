/**
 * Google API Integration
 *
 * Server-side only integrations for Google Maps services.
 * - Places API: Search for nearby service providers
 * - Geocoding API: Convert addresses to coordinates
 */

// Places API
export {
  searchNearbyProviders,
  fetchPlaceDetails,
  getProviderLeadById,
  getProviderLeadByPlaceId,
  type GooglePlaceResult,
  type ProviderSearchParams,
  type ProviderSearchResult,
} from "./places";

// Geocoding API
export {
  geocodeAddress,
  reverseGeocode,
  geocodeProperty,
  geocodeAllProperties,
  getPropertyLocation,
  type GeocodeResult,
} from "./geocoding";

// Invite utilities
export {
  createProviderInvite,
  getInviteByToken,
  updateInviteStatus,
  sendInviteSms,
  sendInviteEmail,
  getHomeownerInvites,
  isInviteValid,
  type CreateInviteParams,
  type ProviderInvite,
} from "./invites";
