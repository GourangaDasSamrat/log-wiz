/**
 * @file src/utils/timestamp.ts
 * @description Zero-dependency ISO timestamp generator using the built-in Intl API.
 */

/**
 * Returns the current time as an ISO-8601 string.
 * Falls back to Date.toISOString() if Intl is unavailable.
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Formats an ISO timestamp for pretty human-readable display.
 * Example: "2024-05-15 14:32:01.123"
 */
export function formatTimestampPretty(isoString: string): string {
  return isoString.replace('T', ' ').replace('Z', '').substring(0, 23);
}
