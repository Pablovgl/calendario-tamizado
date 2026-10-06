import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { decrypt } from "@/lib/crypto";
import { db, schema } from "@/lib/db";

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5";

let platformClient: Anthropic | undefined;

/**
 * Cliente de Claude para un usuario: su API key propia (descifrada) si la tiene
 * y, si no, la ANTHROPIC_API_KEY de la plataforma.
 */
export async function getClaudeClient(userId: string) {
  const user = await db.query.users.findFirst({
    columns: { anthropicApiKey: true },
    where: eq(schema.users.id, userId),
  });
  if (user?.anthropicApiKey) {
    try {
      return new Anthropic({ apiKey: decrypt(user.anthropicApiKey) });
    } catch {
      // No caemos a la key de la plataforma en silencio: sería facturar al dueño sin avisar.
      throw new Error("Tu API key guardada no se pudo leer. Vuelve a guardarla en Ajustes.");
    }
  }
  platformClient ??= new Anthropic(); // lee ANTHROPIC_API_KEY
  return platformClient;
}

export const extractedEventSchema = z.object({
  titulo: z.string(),
  descripcion: z.string().nullish(),
  ubicacion: z.string().nullish(),
  inicio: z.string(),
  fin: z.string().nullish(),
  todoElDia: z.boolean().default(false),
  confianza: z.number().min(0).max(100).default(50),
});
export type ExtractedEvent = z.infer<typeof extractedEventSchema>;

const TOOL_NAME = "registrar_eventos";

const tool: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Registra los eventos de calendario encontrados en el contenido.",
  input_schema: {
    type: "object",
    properties: {
      eventos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            descripcion: { type: "string" },
            ubicacion: { type: "string" },
            inicio: {
              type: "string",
              description:
                "ISO 8601. Solo fecha (YYYY-MM-DD) si es de todo el día; si no, fecha y hora (YYYY-MM-DDTHH:mm:ss).",
            },
            fin: { type: "string", description: "ISO 8601, mismo formato que inicio." },
            todoElDia: { type: "boolean" },
            confianza: {
              type: "number",
              description: "0-100: seguridad de que es un evento real con fecha correcta.",
            },
          },
          required: ["titulo", "inicio", "todoElDia", "confianza"],
        },
      },
    },
    required: ["eventos"],
  },
};

function systemPrompt() {
  const hoy = new Date().toISOString().slice(0, 10);
  return `Extraes eventos de calendario (fechas, horas, lugares) de páginas web e imágenes. Hoy es ${hoy}. Resuelve fechas relativas y sin año con esa referencia. No inventes datos: si no hay eventos, devuelve una lista vacía. Responde siempre llamando a la herramienta ${TOOL_NAME}.`;
}

async function extract(userId: string, content: Anthropic.ContentBlockParam[]) {
  const client = await getClaudeClient(userId);
  const res = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: systemPrompt(),
    tools: [tool],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return [];
  const eventos = (block.input as { eventos?: unknown[] }).eventos ?? [];
  return eventos.flatMap((e) => {
    const parsed = extractedEventSchema.safeParse(e);
    return parsed.success ? [parsed.data] : [];
  });
}

export function extractFromText(userId: string, text: string, origin: string) {
  return extract(userId, [
    {
      type: "text",
      text: `Contenido de ${origin}:\n\n${text.slice(0, 60_000)}`,
    },
  ]);
}

export function extractFromImageUrl(userId: string, url: string) {
  return extract(userId, [
    { type: "image", source: { type: "url", url } },
    { type: "text", text: "Extrae los eventos que aparecen en esta imagen." },
  ]);
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export function extractFromImageData(userId: string, base64: string, mediaType: ImageMediaType) {
  return extract(userId, [
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
    { type: "text", text: "Extrae los eventos que aparecen en esta imagen." },
  ]);
}
