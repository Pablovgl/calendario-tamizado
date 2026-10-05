import { and, eq, inArray } from "drizzle-orm";

import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { cn } from "@/lib/utils";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await auth();
  const { mes } = await searchParams;
  const base = /^\d{4}-\d{2}$/.test(mes ?? "") ? new Date(`${mes}-01T00:00:00Z`) : new Date();
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const evs = await db.query.events.findMany({
    where: and(
      eq(schema.events.userId, session!.user.id),
      inArray(schema.events.estado, ["aprobado", "sincronizado"]),
    ),
  });
  const porDia = new Map<number, string[]>();
  for (const e of evs) {
    if (!e.inicio.startsWith(prefix)) continue;
    const d = Number(e.inicio.slice(8, 10));
    porDia.set(d, [...(porDia.get(d) ?? []), e.titulo]);
  }

  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const nav = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    return `?mes=${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const titulo = new Intl.DateTimeFormat("es", { month: "long", year: "numeric", timeZone: "UTC" }).format(base);

  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold capitalize">{titulo}</h1>
        <div className="flex gap-3 text-sm">
          <a className="underline" href={nav(-1)}>← Anterior</a>
          <a className="underline" href={nav(1)}>Siguiente →</a>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-sm">
        {DIAS.map((d) => (
          <div key={d} className="bg-muted p-2 text-center font-medium">{d}</div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`v${i}`} className="min-h-24 bg-background" />
        ))}
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
          <div key={d} className={cn("min-h-24 bg-background p-1.5")}>
            <span className="text-xs text-muted-foreground">{d}</span>
            {porDia.get(d)?.map((t, i) => (
              <p key={i} className="mt-1 truncate rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {t}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
