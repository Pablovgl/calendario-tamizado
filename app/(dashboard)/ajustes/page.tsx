import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/auth";
import { ApiKeyForm } from "@/components/api-key-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decrypt, maskApiKey } from "@/lib/crypto";
import { db, schema } from "@/lib/db";
import { deleteApiKey, regenerateFeedToken } from "./actions";

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
  const h = await headers();
  const origin = process.env.AUTH_URL ?? `https://${h.get("host")}`;
  const feedUrl = user?.feedToken ? `${origin}/api/calendario/${user.feedToken}/feed.ics` : null;

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

      <Card>
        <CardHeader>
          <CardTitle>Suscripción a tu calendario (.ics)</CardTitle>
          <CardDescription>
            Suscríbete a esta URL desde Google Calendar, Apple Calendar u Outlook para ver tus
            eventos aprobados. Quien tenga la URL puede verlos: no la compartas. Si la regeneras,
            la anterior deja de funcionar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {feedUrl && (
            <Input readOnly value={feedUrl} aria-label="URL del feed" className="font-mono text-xs" />
          )}
          <form action={regenerateFeedToken}>
            <Button type="submit" variant={feedUrl ? "outline" : "default"} size="sm">
              {feedUrl ? "Regenerar URL" : "Generar URL"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
