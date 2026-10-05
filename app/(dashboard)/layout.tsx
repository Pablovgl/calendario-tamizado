import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col gap-6 border-b p-4 md:w-60 md:border-r md:border-b-0">
        <span className="text-lg font-semibold">Calendario Tamizado</span>
        <DashboardNav />
        <div className="mt-auto grid gap-2 text-sm">
          <span className="truncate text-muted-foreground">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm" className="w-full">
              Salir
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
