"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { SOURCE_TYPES } from "@/db/schema";
import { db, schema } from "@/lib/db";
import { assertPublicHttpUrl } from "@/lib/fetch-page";

const sourceSchema = z.object({
  nombre: z.string().trim().min(1),
  tipo: z.enum(SOURCE_TYPES),
  url: z.string().url(),
});

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return session.user.id;
}

export async function addSource(form: FormData) {
  const userId = await requireUserId();
  const data = sourceSchema.parse(Object.fromEntries(form));
  assertPublicHttpUrl(data.url);
  await db.insert(schema.sources).values({ ...data, userId });
  revalidatePath("/fuentes");
}

export async function deleteSource(form: FormData) {
  const userId = await requireUserId();
  const id = z.string().parse(form.get("id"));
  await db
    .delete(schema.sources)
    .where(and(eq(schema.sources.id, id), eq(schema.sources.userId, userId)));
  revalidatePath("/fuentes");
}
