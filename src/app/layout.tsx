import type { Metadata } from "next";
import "geist/font/mono";
import "geist/font/sans";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carcarah | Commerce search revenue leaks",
  description: "Hunt down revenue leaks in commerce search.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
