import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "phota_session";
const PUBLIC_SESSION_COOKIE = "phota_public_session";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/public/")) {
    if (!request.cookies.has(PUBLIC_SESSION_COOKIE)) return NextResponse.redirect(new URL("/public/login",request.url));
    return NextResponse.next();
  }
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/workspace/:path*", "/profile/:path*", "/pending/:path*", "/admin/:path*", "/public/dashboard/:path*", "/public/profile/:path*", "/public/matches/:path*"] };
