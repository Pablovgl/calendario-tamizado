"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginWithGoogle, login, register } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "registro" }) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState(isLogin ? login : register, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isLogin ? "Entrar" : "Crear cuenta"}
        </CardTitle>
        <CardDescription>Calendario Tamizado</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form action={action} className="grid gap-4">
          {!isLogin && (
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" required />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {isLogin ? "Entrar" : "Registrarme"}
          </Button>
        </form>
        <form action={loginWithGoogle}>
          <Button type="submit" variant="outline" className="w-full">
            Continuar con Google
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {isLogin ? (
          <>¿Sin cuenta?&nbsp;<Link className="underline" href="/registro">Regístrate</Link></>
        ) : (
          <>¿Ya tienes cuenta?&nbsp;<Link className="underline" href="/login">Entra</Link></>
        )}
      </CardFooter>
    </Card>
  );
}
