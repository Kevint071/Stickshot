import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getDb } from "@/db";
import { authenticateUser } from "@/server/accounts";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
// La portada es pública; con sesión, todas mandan directo a la app.
const PUBLIC_PATHS = ["/", "/login", "/registro"];
export const HOME_PATH = "/inicio";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials solo funciona con sesión JWT (cookie cifrada con AUTH_SECRET).
  session: { strategy: "jwt", maxAge: THIRTY_DAYS_SECONDS },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials) =>
        authenticateUser(getDb(), {
          email: String(credentials.email ?? ""),
          password: String(credentials.password ?? ""),
        }),
    }),
  ],
  callbacks: {
    // Comprobación optimista que usa src/proxy.ts. La barrera real es verifySession().
    authorized({ auth: session, request }) {
      const isPublic = PUBLIC_PATHS.includes(request.nextUrl.pathname);
      if (isPublic && session) {
        return Response.redirect(new URL(HOME_PATH, request.nextUrl));
      }
      return isPublic || Boolean(session);
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
