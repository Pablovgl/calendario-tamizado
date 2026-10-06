"use client";

import { useActionState } from "react";

import { saveApiKey } from "@/app/(dashboard)/ajustes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ApiKeyForm() {
  const [state, action, pending] = useActionState(saveApiKey, undefined);
  return (
    <form action={action} className="grid gap-2">
      <div className="flex gap-2">
        <Input
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder="sk-ant-…"
          required
        />
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </div>
      {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-muted-foreground">{state.ok}</p>}
    </form>
  );
}
