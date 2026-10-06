import type { CalEvent } from "@/db/schema";

// Generador mínimo de iCalendar (RFC 5545).

const CRLF = "\r\n";

function escapeText(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Pliega líneas a 75 octetos (RFC 5545 §3.1) sin partir caracteres UTF-8. */
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length === 0 ? 75 : 74)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join(CRLF + " ");
}

const pad = (n: number) => String(n).padStart(2, "0");

function utc(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function dateOnly(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[1]}${m[2]}${m[3]}` : null;
}

function addDays(yyyymmdd: string, days: number) {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + days));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** "2026-03-01T20:00" → floating (hora local del suscriptor); con Z u offset → UTC. */
function dateTime(iso: string) {
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(iso)) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : utc(d);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso);
  return m ? `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6] ?? "00"}` : null;
}

function vevent(e: CalEvent): string[] | null {
  const lines = ["BEGIN:VEVENT", `UID:${e.id}@calendario-tamizado`, `DTSTAMP:${utc(e.createdAt)}`];
  if (e.todoElDia) {
    const start = dateOnly(e.inicio);
    if (!start) return null;
    const end = dateOnly(e.fin ?? "") ?? start;
    lines.push(`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${addDays(end < start ? start : end, 1)}`); // DTEND exclusivo
  } else {
    const start = dateTime(e.inicio);
    if (!start) return null;
    const end = e.fin ? dateTime(e.fin) : null;
    lines.push(`DTSTART:${start}`);
    if (end && end >= start) lines.push(`DTEND:${end}`);
  }
  lines.push(`SUMMARY:${escapeText(e.titulo)}`);
  if (e.descripcion) lines.push(`DESCRIPTION:${escapeText(e.descripcion)}`);
  if (e.ubicacion) lines.push(`LOCATION:${escapeText(e.ubicacion)}`);
  if (e.urlOrigen) lines.push(`URL:${e.urlOrigen}`);
  lines.push("END:VEVENT");
  return lines;
}

export function buildIcs(events: CalEvent[], name = "Calendario Tamizado") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calendario Tamizado//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
  ];
  for (const e of events) {
    const v = vevent(e);
    if (v) lines.push(...v);
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join(CRLF) + CRLF;
}
