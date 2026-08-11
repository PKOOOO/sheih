import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "./lib/auth";

// Protects every /api route: without a valid session cookie the request is
// rejected with 401. Only the auth endpoints themselves are open, so the
// client can sign in and check its session.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifyToken(token)) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
