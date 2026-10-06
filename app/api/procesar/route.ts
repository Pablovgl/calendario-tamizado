import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import {
  extractFromImageData,
  extractFromImageUrl,
  extractFromText,
  type ExtractedEvent,
  type ImageMediaType,
} from "@/lib/claude";
import { db, schema } from "@/lib/db";
import { assertPublicHttpUrl, fetchPageText } from "@/lib/fetch-page";

export const maxDuration = 60;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * POST /api/procesar
 *  - JSON: { sourceId } → procesa la URL (o URL de imagen) de la fuente
 *  - multipart: sourceId + file → procesa una imagen subida
 * Guarda los eventos detectados como "pendiente" (bandeja).
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let sourceId: string;
  let file: File | null = null;
  try {
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      sourceId = z.string().parse(form.get("sourceId"));
      const f = form.get("file");
      file = f instanceof File ? f : null;
    } else {
      sourceId = z.object({ sourceId: z.string() }).parse(await req.json()).sourceId;
    }
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const source = await db.query.sources.findFirst({
    where: and(eq(schema.sources.id, sourceId), eq(schema.sources.userId, userId)),
  });
  if (!source) return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });

  try {
    let found: ExtractedEvent[];
    if (file) {
      if (!IMAGE_TYPES.includes(file.type) || file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Imagen no válida (máx. 5 MB)" }, { status: 400 });
      }
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      found = await extractFromImageData(userId, base64, file.type as ImageMediaType);
    } else if (source.tipo === "imagen") {
      assertPublicHttpUrl(source.url);
      found = await extractFromImageUrl(userId, source.url);
    } else {
      found = await extractFromText(userId, await fetchPageText(source.url), source.url);
    }

    if (found.length) {
      await db.insert(schema.events).values(
        found.map((e) => ({
          userId,
          sourceId: source.id,
          titulo: e.titulo,
          descripcion: e.descripcion ?? null,
          ubicacion: e.ubicacion ?? null,
          inicio: e.inicio,
          fin: e.fin ?? null,
          todoElDia: e.todoElDia,
          confianza: Math.round(e.confianza),
          urlOrigen: source.url,
        })),
      );
    }
    await db
      .update(schema.sources)
      .set({ ultimaRevision: new Date(), estado: "activa", ultimoError: null })
      .where(eq(schema.sources.id, source.id));
    return NextResponse.json({ eventos: found.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    await db
      .update(schema.sources)
      .set({ estado: "error", ultimoError: message })
      .where(eq(schema.sources.id, source.id));
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
