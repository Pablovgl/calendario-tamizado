# Calendario Tamizado

SaaS que extrae eventos de URLs e imágenes con Claude (visión) y los sincroniza con Google Calendar.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Turso (libSQL) + Drizzle · NextAuth v5 · Claude API.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena AUTH_SECRET, ANTHROPIC_API_KEY, etc.
npm run db:migrate           # aplica db/migrations a TURSO_DATABASE_URL
npm run dev
```

## Estructura

- `app/(auth)` — login y registro (email/contraseña y Google)
- `app/(dashboard)/fuentes` — gestión de fuentes (URLs / imágenes)
- `app/(dashboard)/bandeja` — eventos pendientes: aprobar (sincroniza con Google Calendar) o descartar
- `app/(dashboard)/calendario` — vista mensual de eventos aprobados
- `app/api/procesar` — endpoint que llama a Claude para extraer eventos
- `lib/claude.ts`, `lib/db.ts`, `lib/google-calendar.ts` — clientes
- `db/schema.ts` — esquema (users, sources, events); migraciones en `db/migrations`

## Notas

- Los componentes de `components/ui` siguen el estilo shadcn/ui (`components.json`); añade más con `npx shadcn@latest add <componente>`.
- Para sincronizar con Google Calendar hay que entrar con Google (scope `calendar.events`, `access_type=offline`).
