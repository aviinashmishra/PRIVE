// Edge middleware: deny-by-default route gating (docs/05 §2). Verifies the signed
// session JWT (no DB on the edge — revocation is enforced again by the API guards)
// and applies role-based access: /admin → admin, /seller → seller, app → any user.
import { NextRequest, NextResponse } from "next/server";
import { verifySessionJwt } from "@/lib/auth/jwt";
import { SESSION_COOKIE, HOME_BY_ROLE } from "@/lib/auth/config";

const PUBLIC_PAGES = new Set([
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/explorer", // Transparency Explorer — public by design (PRD §7, docs/05 §6)
]);

// Public API surface: auth itself, health, market data and the read-only chain
// transparency endpoints (docs/05 §6 — the explorer is public by design).
const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/health",
  "/api/markets",
  "/api/chain/status",
  "/api/chain/events",
];

const AUTH_PAGES = new Set(["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PAGES.has(pathname) || PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionJwt(token) : null;

  // Signed-in users skip the auth pages.
  if (claims && AUTH_PAGES.has(pathname)) {
    return NextResponse.redirect(new URL(HOME_BY_ROLE[claims.role] ?? "/dashboard", req.url));
  }

  if (isPublic) return NextResponse.next();

  if (!claims) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // Role gates. Admins may enter every portal (mission control oversees both).
  if (pathname.startsWith("/admin") && claims.role !== "admin") {
    return NextResponse.redirect(new URL(HOME_BY_ROLE[claims.role] ?? "/dashboard", req.url));
  }
  if (pathname.startsWith("/seller") && claims.role !== "seller" && claims.role !== "admin") {
    return NextResponse.redirect(new URL(HOME_BY_ROLE[claims.role] ?? "/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static assets (paths with a file extension).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
