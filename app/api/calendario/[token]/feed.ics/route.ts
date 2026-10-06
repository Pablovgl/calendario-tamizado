import { and, asc, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { buildIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

/**
 * Feed iCalendar público con los eventos aprobados del usuario. El segmento de la
 * URL es el token secreto del feed (users.feed_token), no el id del usuario.
 */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = token.length >= 32
    ? await db.query.users.findFirst({ where: eq(schema.users.feedToken, token) })
    : undefined;
  if (!user) return new Response("Not found", { status: 404 });

  const events = await db.query.events.findMany({
    where: and(
      eq(schema.events.userId, user.id),
      inArray(schema.events.estado, ["aprobado", "sincronizado"]),
    ),
    orderBy: asc(schema.events.inicio),
  });

  return new Response(buildIcs(events), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="calendario-tamizado.ics"',
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}
