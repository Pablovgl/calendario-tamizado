import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5";

let client: Anthropic | undefined;
function getClient() {
  client ??= new Anthropic(); // lee ANTHROPIC_API_KEY
  return client;
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

async function extract(content: Anthropic.ContentBlockParam[]) {
  const res = await getClient().messages.create({
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

export function extractFromText(text: string, origin: string) {
  return extract([
    {
      type: "text",
      text: `Contenido de ${origin}:\n\n${text.slice(0, 60_000)}`,
    },
  ]);
}

export function extractFromImageUrl(url: string) {
  return extract([
    { type: "image", source: { type: "url", url } },
    { type: "text", text: "Extrae los eventos que aparecen en esta imagen." },
  ]);
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export function extractFromImageData(base64: string, mediaType: ImageMediaType) {
  return extract([
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
    { type: "text", text: "Extrae los eventos que aparecen en esta imagen." },
  ]);
}
