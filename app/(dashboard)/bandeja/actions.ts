"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { pushEvent } from "@/lib/google-calendar";

async function ownedEvent(form: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("No autorizado");
  const id = z.string().parse(form.get("id"));
  const ev = await db.query.events.findFirst({
    where: and(eq(schema.events.id, id), eq(schema.events.userId, userId)),
  });
  if (!ev) throw new Error("Evento no encontrado");
  return { ev, userId };
}

/** Aprueba el evento y, si Google Calendar está conectado, lo sincroniza. */
export async function approveEvent(form: FormData) {
  const { ev, userId } = await ownedEvent(form);
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  let estado: "aprobado" | "sincronizado" = "aprobado";
  let googleEventId: string | null = null;
  if (user?.googleRefreshToken) {
    googleEventId = await pushEvent(user, ev);
    estado = "sincronizado";
  }
  await db
    .update(schema.events)
    .set({ estado, googleEventId })
    .where(eq(schema.events.id, ev.id));
  revalidatePath("/bandeja");
  revalidatePath("/calendario");
}

export async function discardEvent(form: FormData) {
  const { ev } = await ownedEvent(form);
  await db.update(schema.events).set({ estado: "descartado" }).where(eq(schema.events.id, ev.id));
  revalidatePath("/bandeja");
}
