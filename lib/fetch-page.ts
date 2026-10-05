import { isIP } from "node:net";

// Protección básica anti-SSRF: solo http(s) y sin hosts locales/privados literales.
export function assertPublicHttpUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Solo se permiten URLs http(s)");
  }
  const host = url.hostname.toLowerCase();
  const privateV4 = /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/;
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (isIP(host) && (privateV4.test(host) || host === "::1" || host.startsWith("fc") || host.startsWith("fd")))
  ) {
    throw new Error("URL no permitida");
  }
  return url;
}

export async function fetchPageText(raw: string) {
  const url = assertPublicHttpUrl(raw);
  const res = await fetch(url, {
    headers: { "user-agent": "CalendarioTamizado/1.0" },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`La página respondió ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
