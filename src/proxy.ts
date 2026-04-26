import { NextRequest, NextResponse } from "next/server";

const CONTENT_SECTIONS = new Set([
  "overview",
  "ways-of-working",
  "context",
  "strategy",
  "initiatives",
  "architecture",
  "design-system",
  "guides",
  "developer-docs",
  "release",
  "infrastructure",
  "claude-code-advanced",
  "tc-claude",
  "features",
]);

// File extensions = static assets, don't redirect
const STATIC_FILE_REGEX = /\.\w{2,5}$/;

// Public paths that don't require auth
// Exact matches
const PUBLIC_PATHS_EXACT = ["/", "/favicon.ico"];
// Prefix matches
const PUBLIC_PATHS_PREFIX = ["/api/auth/", "/_next/"];

const PUBLIC_EXTENSIONS =
  /\.(png|svg|jpg|jpeg|webp|gif|ico|css|js|woff|woff2)$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Old path 301 redirects (only doc pages, not static files)
  const firstSegment = pathname.split("/")[1];
  if (
    CONTENT_SECTIONS.has(firstSegment) &&
    !STATIC_FILE_REGEX.test(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/docs${pathname}`;
    return NextResponse.redirect(url, 301);
  }

  // 2. Skip auth for public paths
  if (PUBLIC_PATHS_EXACT.includes(pathname)) {
    return NextResponse.next();
  }
  if (PUBLIC_PATHS_PREFIX.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (PUBLIC_EXTENSIONS.test(pathname)) {
    return NextResponse.next();
  }

  // 3. Auth check — temporarily bypassed while TCID auth is being fixed
  // TODO: restore auth enforcement once TCID is working:
  //
  // if (!isAuthConfigured()) {
  //   if (process.env.NODE_ENV === "production") {
  //     return new NextResponse("Service Unavailable - Authentication not configured", { status: 503 });
  //   }
  //   return NextResponse.next();
  // }
  // const sessionCookie = request.cookies.get("tcid_session");
  // if (!sessionCookie?.value) {
  //   const loginUrl = request.nextUrl.clone();
  //   loginUrl.pathname = "/api/auth/tcid/login";
  //   return NextResponse.redirect(loginUrl);
  // }

  return NextResponse.next();
}

// Next.js 16 proxy config
export const config = {
  matcher: [
    // Match all paths except _next/static, _next/image, static files
    "/((?!_next/static|_next/image).*)",
  ],
};
