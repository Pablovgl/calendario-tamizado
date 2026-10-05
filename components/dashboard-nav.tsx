"use client";

import { CalendarDays, Inbox, Link2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/fuentes", label: "Fuentes", icon: Link2 },
  { href: "/bandeja", label: "Bandeja", icon: Inbox },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 md:flex-col">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
            pathname.startsWith(href) && "bg-accent",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
