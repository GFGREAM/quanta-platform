import { NextResponse, type NextRequest } from "next/server";

// All NextAuth cookie names that must be cleared on logout.
// NextAuth fragments large JWTs into numbered chunks (.0, .1, …); we cover
// up to .3 which is well beyond what a lean session (no id_token) needs.
//
// Two sets exist because the cookie name depends on the protocol:
//   __Secure- / __Host-  →  HTTPS (production)
//   plain name           →  HTTP  (local dev)
//
// Browsers require the Secure attribute to be present in any Set-Cookie that
// touches a __Secure- or __Host- prefixed cookie, so we split into two loops.
// On HTTP, the browser silently ignores Set-Cookie: Secure, making the secure
// deletions a no-op — no error, no side-effect.
const SECURE_COOKIES = [
  "__Secure-next-auth.session-token",
  "__Secure-next-auth.session-token.0",
  "__Secure-next-auth.session-token.1",
  "__Secure-next-auth.session-token.2",
  "__Secure-next-auth.session-token.3",
  "__Host-next-auth.csrf-token",
  "__Secure-next-auth.callback-url",
];

const PLAIN_COOKIES = [
  "next-auth.session-token",
  "next-auth.session-token.0",
  "next-auth.session-token.1",
  "next-auth.session-token.2",
  "next-auth.session-token.3",
  "next-auth.csrf-token",
  "next-auth.callback-url",
];

export async function GET(req: NextRequest) {
  const origin =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    new URL(req.url).origin;

  const tenantId = process.env.AUTH_AZURE_AD_TENANT_ID ?? "";
  const msLogoutUrl = new URL(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`,
  );
  msLogoutUrl.searchParams.set("post_logout_redirect_uri", `${origin}/login`);

  const response = NextResponse.redirect(msLogoutUrl.toString());

  for (const name of SECURE_COOKIES) {
    response.cookies.set(name, "", { maxAge: 0, path: "/", secure: true });
  }
  for (const name of PLAIN_COOKIES) {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  }

  return response;
}
