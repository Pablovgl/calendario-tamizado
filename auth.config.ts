import type { NextAuthConfig } from "next-auth";

// Configuración compatible con el runtime edge (la usa el middleware).
export default {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const logged = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isAuthPage = pathname === "/login" || pathname === "/registro";
      if (isAuthPage) {
        return logged ? Response.redirect(new URL("/bandeja", request.nextUrl)) : true;
      }
      const isPublic = pathname === "/" || pathname.startsWith("/api/auth");
      return isPublic || logged;
    },
  },
} satisfies NextAuthConfig;
