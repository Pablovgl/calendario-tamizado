import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const users = sqliteTable(
  "users",
  {
    id: id(),
    name: text("name"),
    email: text("email").notNull().unique(),
    // null cuando el usuario solo entra con Google
    passwordHash: text("password_hash"),
    image: text("image"),
    // Token de refresco de Google para sincronizar con Google Calendar
    googleRefreshToken: text("google_refresh_token"),
    googleCalendarId: text("google_calendar_id").notNull().default("primary"),
    createdAt: createdAt(),
    // API key de Anthropic del usuario
    anthropicApiKey: text("anthropic_api_key"),
    // Token secreto para el feed de calendario del usuario
    feedToken: text("feed_token"),
  },
  (t) => [uniqueIndex("users_feed_token_unique").on(t.feedToken)],
);

export const SOURCE_TYPES = ["url", "imagen"] as const;
export const SOURCE_STATES = ["activa", "pausada", "error"] as const;

export const sources = sqliteTable("sources", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tipo: text("tipo", { enum: SOURCE_TYPES }).notNull(),
  nombre: text("nombre").notNull(),
  // URL de la página, o URL de la imagen cuando tipo = "imagen"
  url: text("url").notNull(),
  estado: text("estado", { enum: SOURCE_STATES }).notNull().default("activa"),
  ultimoError: text("ultimo_error"),
  ultimaRevision: integer("ultima_revision", { mode: "timestamp" }),
  createdAt: createdAt(),
  // Hash del último contenido revisado, para saltar fuentes sin cambios
  lastContentHash: text("last_content_hash"),
});

export const EVENT_STATES = [
  "pendiente",
  "aprobado",
  "descartado",
  "sincronizado",
] as const;

export const events = sqliteTable(
  "events",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: text("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion"),
    ubicacion: text("ubicacion"),
    // ISO 8601: fecha (YYYY-MM-DD) si todoElDia, fecha-hora con zona en otro caso
    inicio: text("inicio").notNull(),
    fin: text("fin"),
    todoElDia: integer("todo_el_dia", { mode: "boolean" })
      .notNull()
      .default(false),
    urlOrigen: text("url_origen"),
    // 0-100, estimado por Claude
    confianza: integer("confianza"),
    estado: text("estado", { enum: EVENT_STATES })
      .notNull()
      .default("pendiente"),
    googleEventId: text("google_event_id"),
    createdAt: createdAt(),
    // Hash para evitar eventos duplicados por usuario
    dedupeHash: text("dedupe_hash"),
  },
  (t) => [uniqueIndex("events_user_dedupe_idx").on(t.userId, t.dedupeHash)],
);

export type User = typeof users.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type CalEvent = typeof events.$inferSelect;
export type NewCalEvent = typeof events.$inferInsert;
