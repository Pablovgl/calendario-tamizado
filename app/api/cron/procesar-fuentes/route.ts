import { timingSafeEqual } from "node:crypto";

import { asc, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/lib/db";
import { processSource } from "@/lib/procesar";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TIME_BUDGET_MS = (maxDuration - 30) * 1000;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Revisa todas las fuentes no pausadas de todos los usuarios (las que dieron error
 * se reintentan). Vercel Cron envía `Authorization: Bearer $CRON_SECRET`.
 * Se procesan las menos recientes primero y se corta antes del límite de tiempo;
 * el resto se revisa en la siguiente ejecución.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const started = Date.now();
  const sources = await db.query.sources.findMany({
    where: ne(schema.sources.estado, "pausada"),
    orderBy: asc(schema.sources.ultimaRevision), // nunca revisadas (NULL) primero
  });

  const summary = { total: sources.length, revisadas: 0, sinCambios: 0, errores: 0, eventosNuevos: 0, pendientes: 0 };
  for (const source of sources) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      summary.pendientes = summary.total - summary.revisadas - summary.errores;
      break;
    }
    try {
      const r = await processSource(source);
      summary.revisadas++;
      summary.eventosNuevos += r.nuevos;
      if (r.omitida) summary.sinCambios++;
    } catch (err) {
      summary.errores++;
      console.error(`[cron] fuente ${source.id}:`, err instanceof Error ? err.message : err);
    }
  }
  return NextResponse.json(summary);
}
