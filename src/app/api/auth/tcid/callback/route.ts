import { NextRequest, NextResponse } from "next/server";
import { authConfig, isAuthConfigured } from "@/lib/auth-config";
import { createSessionCookie } from "@/lib/auth-cookies";

export async function GET(request: NextRequest) {
  if (!isAuthConfigured()) {
    return Response.json(
      { error: "Authentication is not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return Response.json(
      { error: "Missing code or state parameter" },
      { status: 400 },
    );
  }

  // Verify state matches cookie
  const storedState = request.cookies.get("tcid_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return Response.json({ error: "Invalid state parameter" }, { status: 403 });
  }

  const redirectUri = `${authConfig.appUrl}/api/auth/tcid/callback`;

  // Exchange code for token
  const tokenResponse = await fetch(`${authConfig.issuerUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: authConfig.clientId!,
      client_secret: authConfig.clientSecret!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    console.error("Token exchange failed:", tokenResponse.status, text);
    return Response.json(
      { error: "Token exchange failed" },
      { status: 502 },
    );
  }

  const tokenData = await tokenResponse.json();
  const { access_token, expires_in, microsoft_token } = tokenData;

  // Fetch user info
  const userInfoResponse = await fetch(`${authConfig.issuerUrl}/userinfo`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userInfoResponse.ok) {
    console.error("Userinfo fetch failed:", userInfoResponse.status);
    return Response.json(
      { error: "Failed to fetch user info" },
      { status: 502 },
    );
  }

  const user = await userInfoResponse.json();

  // Build session cookie
  const sessionSecret =
    authConfig.sessionSecret ?? authConfig.clientSecret ?? "fallback-secret";
  const sessionValue = createSessionCookie(user, sessionSecret);

  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.redirect(authConfig.appUrl!);

  // Clear the OAuth state cookie
  response.cookies.delete("tcid_oauth_state");

  // Session cookie — 7 days
  response.cookies.set("tcid_session", sessionValue, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 3600, // 7 days
    path: "/",
  });

  // Access token cookie
  response.cookies.set("tcid_token", access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: expires_in ?? 3600,
    path: "/",
  });

  // Microsoft token (if present, e.g. from AAD passthrough)
  if (microsoft_token) {
    response.cookies.set("microsoft_token", microsoft_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: expires_in ?? 3600,
      path: "/",
    });
  }

  return response;
}
