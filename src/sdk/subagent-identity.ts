/**
 * Subagent Identity Helpers
 *
 * Pure identity utilities for generating display IDs from session IDs.
 * Separated from presentation logic to keep identity concerns isolated.
 */

/**
 * Generate a short ID from a full session ID.
 *
 * Extracts the last 6 characters of the session ID and converts to lowercase.
 * Useful for creating compact, readable identifiers for display.
 *
 * @param sessionId - The full session ID from the SDK
 * @returns Lowercase 6-character short ID
 * @example
 * generateShortId("sess-abc123-def456"); // Returns "ef456"
 * generateShortId("ABC-DEF-GHI"); // Returns "f-ghi"
 */
export function generateShortId(sessionId: string): string {
  if (!sessionId || sessionId.length === 0) {
    return "";
  }
  const lastSix = sessionId.slice(-6);
  return lastSix.toLowerCase();
}
