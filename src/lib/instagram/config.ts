/**
 * Single source of truth for Instagram Platform constants (DECISIONS §1/§2/§3).
 * Verified against official Meta docs 2026-07-25. Do NOT hard-code the version
 * elsewhere — import IG_API_VERSION.
 */

export const IG_API_VERSION = "v25.0";

// Hosts
export const IG_GRAPH_HOST = "https://graph.instagram.com";
export const IG_AUTH_HOST = "https://www.instagram.com"; // authorization window
export const IG_TOKEN_HOST = "https://api.instagram.com"; // code -> short-lived token

// Base for versioned Graph calls (profile, media, messages, comments)
export const IG_GRAPH_BASE = `${IG_GRAPH_HOST}/${IG_API_VERSION}`;

// Permissions we request (only what we use).
export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
] as const;

export const IG_SCOPE_STRING = IG_SCOPES.join(",");

// Webhook fields we subscribe the account to.
export const WEBHOOK_FIELDS = ["comments", "messages"] as const;

// Long-lived tokens last ~60 days; refresh comfortably before expiry.
export const TOKEN_REFRESH_THRESHOLD_DAYS = 10;
