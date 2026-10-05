"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ProcessButton({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [msg, setMsg] = useState<string>();

  async function run() {
    setState("loading");
    setMsg(undefined);
    try {
      const res = await fetch("/api/procesar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      setMsg(res.ok ? `${data.eventos} evento(s)` : data.error);
      router.refresh();
    } catch {
      setMsg("Error de red");
    } finally {
      setState("idle");
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <Button size="sm" variant="outline" onClick={run} disabled={state === "loading"}>
        {state === "loading" ? "Procesando…" : "Procesar"}
      </Button>
    </div>
  );
}
