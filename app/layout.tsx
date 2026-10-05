import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Calendario Tamizado",
  description:
    "Extrae eventos de URLs e imágenes con IA y sincronízalos con Google Calendar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
