import { desc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";

import { auth } from "@/auth";
import { ProcessButton } from "@/components/process-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db, schema } from "@/lib/db";
import { addSource, deleteSource } from "./actions";

export default async function FuentesPage() {
  const session = await auth();
  const sources = await db.query.sources.findMany({
    where: eq(schema.sources.userId, session!.user.id),
    orderBy: desc(schema.sources.createdAt),
  });

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-2xl font-semibold">Fuentes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Añadir fuente</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addSource} className="grid gap-3 sm:grid-cols-[1fr_8rem_2fr_auto]">
            <Input name="nombre" placeholder="Nombre" required />
            <select
              name="tipo"
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              defaultValue="url"
            >
              <option value="url">Página web</option>
              <option value="imagen">Imagen</option>
            </select>
            <Input name="url" type="url" placeholder="https://…" required />
            <Button type="submit">Añadir</Button>
          </form>
        </CardContent>
      </Card>

      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay fuentes.</p>
      ) : (
        <ul className="grid gap-3">
          {sources.map((s) => (
            <li key={s.id}>
              <Card className="py-4">
                <CardContent className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.nombre}</p>
                    <p className="truncate text-sm text-muted-foreground">{s.url}</p>
                    {s.ultimoError && (
                      <p className="text-sm text-destructive">{s.ultimoError}</p>
                    )}
                  </div>
                  <Badge variant={s.estado === "error" ? "destructive" : "secondary"}>
                    {s.tipo} · {s.estado}
                  </Badge>
                  <ProcessButton sourceId={s.id} />
                  <form action={deleteSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost" size="icon" aria-label="Eliminar">
                      <Trash2 />
                    </Button>
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
