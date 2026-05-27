import { NextRequest, NextResponse } from "next/server";

export default function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get("authjs.session-token");
  const isLoggedIn = !!sessionToken;
  const { pathname } = req.nextUrl;

  if (!isLoggedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
