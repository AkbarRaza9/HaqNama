import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageContext";

export const metadata: Metadata = {
  title: "HaqNama — Your Rights, Simplified | حق نامہ — آپ کے حقوق",
  description:
    "A bilingual (Urdu/English) legal information assistant for Pakistani citizens. Get clear, curated answers about civic procedures. This is not legal advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <html lang="en" dir="ltr">
        <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
          {children}
        </body>
      </html>
    </LanguageProvider>
  );
}
