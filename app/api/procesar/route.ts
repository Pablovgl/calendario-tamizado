import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { extractFromImageData, type ImageMediaType } from "@/lib/claude";
import { db, schema } from "@/lib/db";
import { processSource, saveEvents } from "@/lib/procesar";

export const maxDuration = 60;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * POST /api/procesar
 *  - JSON: { sourceId } → revisa la URL (o imagen) de la fuente
 *  - multipart: sourceId + file → procesa una imagen subida
 * Guarda los eventos nuevos como "pendiente" (bandeja); los duplicados se ignoran.
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
    if (file) {
      if (!IMAGE_TYPES.includes(file.type) || file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Imagen no válida (máx. 5 MB)" }, { status: 400 });
      }
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const found = await extractFromImageData(userId, base64, file.type as ImageMediaType);
      const nuevos = await saveEvents(source, found);
      return NextResponse.json({ eventos: nuevos });
    }
    const r = await processSource(source, { force: true });
    return NextResponse.json({ eventos: r.nuevos });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 502 });
  }
}
