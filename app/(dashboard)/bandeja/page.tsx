import { and, asc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db, schema } from "@/lib/db";
import { approveEvent, discardEvent } from "./actions";

export default async function BandejaPage() {
  const session = await auth();
  const pendientes = await db.query.events.findMany({
    where: and(
      eq(schema.events.userId, session!.user.id),
      eq(schema.events.estado, "pendiente"),
    ),
    orderBy: asc(schema.events.inicio),
  });

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-2xl font-semibold">Bandeja</h1>
      {pendientes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay eventos pendientes. Procesa una fuente para encontrar nuevos.
        </p>
      ) : (
        <ul className="grid gap-3">
          {pendientes.map((e) => (
            <li key={e.id}>
              <Card className="py-4">
                <CardContent className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {e.inicio}
                      {e.fin ? ` → ${e.fin}` : ""}
                      {e.ubicacion ? ` · ${e.ubicacion}` : ""}
                    </p>
                    {e.descripcion && <p className="mt-1 text-sm">{e.descripcion}</p>}
                  </div>
                  {e.confianza != null && <Badge variant="outline">{e.confianza}%</Badge>}
                  <form action={approveEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button size="sm">Aprobar</Button>
                  </form>
                  <form action={discardEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button size="sm" variant="ghost">Descartar</Button>
                  </form>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
