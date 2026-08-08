import type { Metadata } from "next";
import "geist/font/mono";
import "geist/font/sans";

import { ConditionalSiteHeader } from "@/components/conditional-site-header";
import { DemoResetControl } from "@/components/demo-reset-control";
import { MotionProvider } from "@/components/motion-provider";
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
          <ConditionalSiteHeader />
          {children}
          <DemoResetControl />
        </MotionProvider>
      </body>
    </html>
  );
}
