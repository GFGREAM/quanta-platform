import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AUTH_AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AUTH_AZURE_AD_TENANT_ID!,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.email = (profile as Record<string, unknown>).preferred_username as string || profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: useSecureCookies ? ("none" as const) : ("lax" as const),
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: useSecureCookies
        ? `__Secure-next-auth.callback-url`
        : `next-auth.callback-url`,
      options: {
        sameSite: useSecureCookies ? ("none" as const) : ("lax" as const),
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: useSecureCookies
        ? `__Host-next-auth.csrf-token`
        : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: useSecureCookies ? ("none" as const) : ("lax" as const),
        path: "/",
        secure: useSecureCookies,
      },
    },
    state: {
      name: useSecureCookies
        ? `__Secure-next-auth.state`
        : `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: useSecureCookies ? ("none" as const) : ("lax" as const),
        path: "/",
        secure: useSecureCookies,
        maxAge: 900,
      },
    },
  },
};

/**
 * True only in local development with AUTH_BYPASS=1. Never true in production
 * (guarded by NODE_ENV), so it cannot weaken auth on a deployed environment.
 */
export function isDevAuthBypass(): boolean {
  return process.env.NODE_ENV === "development" && process.env.AUTH_BYPASS === "1";
}

/**
 * Returns the authenticated session, or — only under isDevAuthBypass() — a
 * synthetic session so API routes work without an Azure AD login (mirrors the
 * middleware/page bypass). The synthetic email comes from AUTH_BYPASS_EMAIL,
 * falling back to a dummy local address. Production behaviour is unchanged.
 */
export async function getSessionOrBypass(): Promise<Session | null> {
  if (isDevAuthBypass()) {
    const email = process.env.AUTH_BYPASS_EMAIL || "dev@localhost";
    return { user: { email }, expires: "" } as Session;
  }
  return getServerSession(authOptions);
}
