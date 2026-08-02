import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NOVA | Moda premium",
  description: "Loja de demonstração NOVA.",
};

export default function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
