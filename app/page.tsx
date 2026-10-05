import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Calendario Tamizado</h1>
      <p className="text-muted-foreground">
        Añade páginas web e imágenes, deja que Claude encuentre los eventos y
        sincroniza solo los que te interesan con Google Calendar.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">Entrar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/registro">Crear cuenta</Link>
        </Button>
      </div>
    </main>
  );
}
