import { google } from "googleapis";

import type { CalEvent, User } from "@/db/schema";

function calendarFor(refreshToken: string) {
  const oauth = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  );
  oauth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth });
}

/** Crea el evento en Google Calendar y devuelve su id. */
export async function pushEvent(user: Pick<User, "googleRefreshToken" | "googleCalendarId">, ev: CalEvent) {
  if (!user.googleRefreshToken) throw new Error("Google Calendar no está conectado");
  const timeZone = "UTC";
  const when = (v: string) =>
    ev.todoElDia ? { date: v.slice(0, 10) } : { dateTime: v, timeZone };
  const res = await calendarFor(user.googleRefreshToken).events.insert({
    calendarId: user.googleCalendarId,
    requestBody: {
      summary: ev.titulo,
      description: ev.descripcion ?? undefined,
      location: ev.ubicacion ?? undefined,
      start: when(ev.inicio),
      end: when(ev.fin ?? ev.inicio),
    },
  });
  return res.data.id ?? null;
}
