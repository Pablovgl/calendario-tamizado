"use server";

import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export type SettingsState = { error?: string; ok?: string } | undefined;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return session.user.id;
}

export async function saveApiKey(_: SettingsState, form: FormData): Promise<SettingsState> {
  const userId = await requireUserId();
  const key = String(form.get("apiKey") ?? "").trim();
  if (!/^sk-ant-[\w-]{20,}$/.test(key)) {
    return { error: "No parece una API key de Anthropic (debe empezar por sk-ant-)" };
  }
  await db
    .update(schema.users)
    .set({ anthropicApiKey: encrypt(key) })
    .where(eq(schema.users.id, userId));
  revalidatePath("/ajustes");
  return { ok: "API key guardada" };
}

export async function deleteApiKey() {
  const userId = await requireUserId();
  await db.update(schema.users).set({ anthropicApiKey: null }).where(eq(schema.users.id, userId));
  revalidatePath("/ajustes");
}

/** Crea (o regenera, invalidando la URL anterior) el token del feed .ics. */
export async function regenerateFeedToken() {
  const userId = await requireUserId();
  await db
    .update(schema.users)
    .set({ feedToken: randomBytes(32).toString("base64url") })
    .where(eq(schema.users.id, userId));
  revalidatePath("/ajustes");
}
