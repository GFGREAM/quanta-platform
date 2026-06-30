import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  // Read session to get the id_token persisted in Step 1.
  // Use getServerSession directly (not getSessionOrBypass) so the dev bypass
  // doesn't inject a synthetic session without a real idToken here.
  const session = await getServerSession(authOptions);

  // Build the post-logout redirect URI.
  // Prefer NEXTAUTH_URL (authoritative in all envs); fall back to the request
  // origin so the route works even if the env var is missing.
  const origin =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    new URL(req.url).origin;
  const postLogoutRedirectUri = `${origin}/login`;

  // Construct the Microsoft end_session_endpoint.
  const tenantId = process.env.AUTH_AZURE_AD_TENANT_ID ?? "";
  const msLogoutUrl = new URL(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`,
  );
  msLogoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  // Include id_token_hint only when available — Azure AD uses it to skip the
  // account-picker prompt and to unambiguously identify which SSO session to end.
  if (session?.idToken) {
    msLogoutUrl.searchParams.set("id_token_hint", session.idToken);
  }

  const response = NextResponse.redirect(msLogoutUrl.toString());

  // Clear the NextAuth session cookie before the browser follows the redirect.
  //
  // Two cookie names exist depending on the environment:
  //   Production (HTTPS): "__Secure-next-auth.session-token"
  //     — has Secure + SameSite=None (required for cross-site iframes)
  //   Local (HTTP):        "next-auth.session-token"
  //     — has SameSite=Lax, no Secure flag
  //
  // We delete BOTH unconditionally.  This is safe because:
  //   • On HTTP: browsers ignore Set-Cookie headers with Secure=true, so the
  //     production-cookie deletion is a no-op — the local cookie is cleared.
  //   • On HTTPS: the __Secure- deletion is honored; the plain-name cookie
  //     doesn't exist in production, so that Set-Cookie is a harmless no-op.
  response.cookies.set("__Secure-next-auth.session-token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  response.cookies.set("next-auth.session-token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  return response;
}
