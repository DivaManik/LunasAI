import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Syne } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LunasAI — AI Agent yang Bisa Bayar Sendiri",
  description:
    "Beri AI budget IDRX lewat kartu delegasi on-chain di BNB Chain. Kelola spending card LunasAI kamu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${syne.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <Providers>
          <div className="grid-overlay" aria-hidden="true" />
          <Navbar />
          <div className="relative z-[1] pt-16">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
