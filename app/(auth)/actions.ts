"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/auth";
import { db, schema } from "@/lib/db";

export type AuthState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/bandeja" });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Email o contraseña incorrectos" };
    throw err; // el redirect de Next debe propagarse
  }
}

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = loginSchema
    .extend({ name: z.string().trim().min(1, "Indica tu nombre") })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email.toLowerCase();

  const exists = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  if (exists) return { error: "Ya existe una cuenta con ese email" };

  await db.insert(schema.users).values({
    email,
    name: parsed.data.name,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
  });
  return login(undefined, form);
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/bandeja" });
}
