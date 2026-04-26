import { NextRequest } from "next/server";
import { authConfig, isAuthConfigured } from "@/lib/auth-config";
import { verifySessionCookie } from "@/lib/auth-cookies";

/**
 * GET /api/auth/tcid/session
 *
 * CRITICAL: Always returns HTTP 200, even when unauthenticated.
 * The ECS health check hits this endpoint and expects a 200.
 */
export async function GET(request: NextRequest) {
  if (!isAuthConfigured()) {
    return Response.json({ authenticated: false });
  }

  const sessionCookie = request.cookies.get("tcid_session")?.value;

  if (!sessionCookie) {
    return Response.json({ authenticated: false });
  }

  const sessionSecret =
    authConfig.sessionSecret ?? authConfig.clientSecret ?? "fallback-secret";

  const user = verifySessionCookie(sessionCookie, sessionSecret);

  if (!user) {
    return Response.json({ authenticated: false });
  }

  return Response.json({ authenticated: true, user });
}
