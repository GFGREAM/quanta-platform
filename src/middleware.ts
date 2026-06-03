import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const BYPASS_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.AUTH_BYPASS_LOCAL === "true";

export async function middleware(request: NextRequest) {
  if (BYPASS_ENABLED) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
