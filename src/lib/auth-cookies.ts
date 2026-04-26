import { createHmac } from "crypto";

export interface SessionUser {
  sub?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

interface SessionPayload {
  user: SessionUser;
  expiresOn: number;
}

/**
 * Create an HMAC-signed session cookie value.
 *
 * Format: `base64url(json_payload).hmac_signature`
 */
export function createSessionCookie(
  user: SessionUser,
  sessionSecret: string,
): string {
  const payload: SessionPayload = {
    user,
    expiresOn: Date.now() + 8 * 3600 * 1000, // 8 hours
  };

  const encoded = Buffer.from(JSON.stringify(payload))
    .toString("base64url");

  const signature = createHmac("sha256", sessionSecret)
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

/**
 * Verify an HMAC-signed session cookie and return the user payload,
 * or null when the cookie is invalid / expired.
 */
export function verifySessionCookie(
  cookieValue: string,
  sessionSecret: string,
): SessionUser | null {
  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encoded = cookieValue.slice(0, dotIndex);
  const signature = cookieValue.slice(dotIndex + 1);

  const expectedSignature = createHmac("sha256", sessionSecret)
    .update(encoded)
    .digest("base64url");

  // Constant-time comparison
  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(signature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8"),
    );

    if (payload.expiresOn <= Date.now()) return null;

    return payload.user;
  } catch {
    return null;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks on HMAC.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
