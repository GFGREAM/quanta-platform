import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";

const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

const BYPASS_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.AUTH_BYPASS_LOCAL === "true";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AUTH_AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AUTH_AZURE_AD_TENANT_ID!,
    }),
    ...(BYPASS_ENABLED
      ? [
          CredentialsProvider({
            id: "dev-bypass",
            name: "Dev Login",
            credentials: {},
            async authorize() {
              return {
                id: "dev-local",
                email: "dev@local.test",
                name: "Dev User",
              };
            },
          }),
        ]
      : []),
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
