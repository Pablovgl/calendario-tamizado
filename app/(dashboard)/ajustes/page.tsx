import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { ApiKeyForm } from "@/components/api-key-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decrypt, maskApiKey } from "@/lib/crypto";
import { db, schema } from "@/lib/db";
import { deleteApiKey } from "./actions";

function maskedKey(encrypted: string | null) {
  if (!encrypted) return null;
  try {
    return maskApiKey(decrypt(encrypted));
  } catch {
    return "ilegible (vuelve a guardarla)";
  }
}

export default async function AjustesPage() {
  const session = await auth();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session!.user.id),
  });
  const masked = maskedKey(user?.anthropicApiKey ?? null);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <Card>
        <CardHeader>
          <CardTitle>API key de Anthropic</CardTitle>
          <CardDescription>
            Si guardas la tuya, las extracciones se facturan a tu cuenta de Anthropic. Se guarda
            cifrada y nunca se vuelve a mostrar completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {masked ? (
            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <code className="text-sm">{masked}</code>
              <form action={deleteApiKey}>
                <Button type="submit" variant="outline" size="sm">Eliminar</Button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tienes API key propia guardada.</p>
          )}
          <ApiKeyForm />
        </CardContent>
      </Card>
    </div>
  );
}
