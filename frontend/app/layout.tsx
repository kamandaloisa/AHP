import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../components/Navbar";
import Providers from "../components/Providers";

export const metadata: Metadata = {
  title: "AHP Shipyard Decision System",
  description: "Sistem Pendukung Keputusan metode AHP untuk pemilihan galangan kapal — dengan login, backend + grafik interaktif",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-800 antialiased">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 text-center text-xs text-slate-400">
            <p>
              AHP Shipyard Decision System • Skala Saaty 1–9 • CR ≤ 0.1 konsisten • Backend Express + SQLite • Frontend Next.js
            </p>
            <p className="mt-1 text-slate-300">
              Data tersinkron ke backend bila online, otomatis fallback ke browser (localStorage) bila offline.
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
