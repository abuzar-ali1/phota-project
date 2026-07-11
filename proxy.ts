import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "phota_session";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/workspace/:path*", "/profile/:path*", "/pending/:path*", "/admin/:path*"] };
