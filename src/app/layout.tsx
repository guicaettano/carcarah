import type { Metadata } from "next";
import "geist/font/mono";
import "geist/font/sans";

import { MotionProvider } from "@/components/motion-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carcarah | Inteligência de busca para e-commerce",
  description: "Encontre onde sua busca está deixando vendas escapar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <MotionProvider>
          <SiteHeader />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
