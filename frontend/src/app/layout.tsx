import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PCD.LAB/04 — Forensik Citra Struk Belanja",
  description:
    "Instrumen forensik citra struk belanja berbasis OpenCV klasik (tanpa YOLO / Deep Learning) — Kelompok 4 PCD 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-white font-sans text-neutral-950 antialiased selection:bg-neutral-950 selection:text-white">
        {children}
      </body>
    </html>
  );
}
