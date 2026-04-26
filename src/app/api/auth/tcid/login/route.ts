import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { authConfig, isAuthConfigured } from "@/lib/auth-config";

export async function GET() {
  if (!isAuthConfigured()) {
    return Response.json(
      { error: "Authentication is not configured" },
      { status: 503 },
    );
  }

  const state = randomBytes(32).toString("hex");

  const redirectUri = `${authConfig.appUrl}/api/auth/tcid/callback`;

  const params = new URLSearchParams({
    client_id: authConfig.clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: "openid profile email",
  });

  const authorizationUrl = `${authConfig.issuerUrl}/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authorizationUrl);

  // State cookie — httpOnly, 5 minute expiry
  response.cookies.set("tcid_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return response;
}
