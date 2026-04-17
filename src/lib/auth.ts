import type { NextAuthOptions } from "next-auth";
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
        token.email = (profile as any).preferred_username || profile.email;
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
