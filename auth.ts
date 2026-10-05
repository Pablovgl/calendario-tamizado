import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";

import authConfig from "./auth.config";
import { db, schema } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await db.query.users.findFirst({
          where: eq(schema.users.email, parsed.data.email.toLowerCase()),
        });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        return ok ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.email) return true;
      const email = profile.email.toLowerCase();
      const existing = await db.query.users.findFirst({
        where: eq(schema.users.email, email),
      });
      const refresh = account.refresh_token ?? undefined;
      if (existing) {
        if (refresh) {
          await db
            .update(schema.users)
            .set({ googleRefreshToken: refresh })
            .where(eq(schema.users.id, existing.id));
        }
      } else {
        await db.insert(schema.users).values({
          email,
          name: profile.name,
          image: profile.picture as string | undefined,
          googleRefreshToken: refresh,
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Resolvemos siempre el id interno de la base de datos
      if (user || account) {
        const email = (user?.email ?? token.email)?.toLowerCase();
        if (email) {
          const row = await db.query.users.findFirst({
            where: eq(schema.users.email, email),
          });
          if (row) token.uid = row.id;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});
