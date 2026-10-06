import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import type { Source } from "@/db/schema";
import { extractFromImageData, extractFromText, type ExtractedEvent, type ImageMediaType } from "@/lib/claude";
import { db, schema } from "@/lib/db";
import { fetchImage, fetchPageText } from "@/lib/fetch-page";

const sha256 = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");

export function dedupeHash(userId: string, e: Pick<ExtractedEvent, "titulo" | "inicio">) {
  return sha256(`${userId}\n${e.titulo.trim().toLowerCase()}\n${e.inicio}`);
}

export type ProcessResult = { nuevos: number; detectados: number; omitida: boolean };

export async function saveEvents(source: Source, found: ExtractedEvent[]) {
  if (!found.length) return 0;
  const inserted = await db
    .insert(schema.events)
    .values(
      found.map((e) => ({
        userId: source.userId,
        sourceId: source.id,
        titulo: e.titulo,
        descripcion: e.descripcion ?? null,
        ubicacion: e.ubicacion ?? null,
        inicio: e.inicio,
        fin: e.fin ?? null,
        todoElDia: e.todoElDia,
        confianza: Math.round(e.confianza),
        urlOrigen: source.url,
        dedupeHash: dedupeHash(source.userId, e),
      })),
    )
    .onConflictDoNothing()
    .returning({ id: schema.events.id });
  return inserted.length;
}

/**
 * Revisa una fuente: descarga el contenido, lo hashea y, si cambió (o `force`),
 * pregunta a Claude y guarda como pendientes solo los eventos que no existían ya.
 * Actualiza el estado de la fuente; relanza el error tras registrarlo.
 */
export async function processSource(source: Source, opts: { force?: boolean } = {}): Promise<ProcessResult> {
  try {
    let hash: string;
    let run: () => Promise<ExtractedEvent[]>;
    if (source.tipo === "imagen") {
      const img = await fetchImage(source.url);
      hash = sha256(img.bytes);
      run = () => extractFromImageData(source.userId, img.base64, img.mediaType as ImageMediaType);
    } else {
      const text = await fetchPageText(source.url);
      hash = sha256(text);
      run = () => extractFromText(source.userId, text, source.url);
    }

    let result: ProcessResult = { nuevos: 0, detectados: 0, omitida: true };
    if (opts.force || hash !== source.lastContentHash) {
      const found = await run();
      result = { nuevos: await saveEvents(source, found), detectados: found.length, omitida: false };
    }
    await db
      .update(schema.sources)
      .set({ ultimaRevision: new Date(), estado: "activa", ultimoError: null, lastContentHash: hash })
      .where(eq(schema.sources.id, source.id));
    return result;
  } catch (err) {
    await db
      .update(schema.sources)
      .set({ ultimaRevision: new Date(), estado: "error", ultimoError: err instanceof Error ? err.message : "Error desconocido" })
      .where(eq(schema.sources.id, source.id));
    throw err;
  }
}
