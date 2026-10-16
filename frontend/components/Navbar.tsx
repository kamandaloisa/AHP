"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../lib/auth";

const MENUS = [
  { href: "/", label: "Dashboard" },
  { href: "/kriteria", label: "Kriteria" },
  { href: "/alternatif", label: "Alternatif" },
  { href: "/perbandingan", label: "Perbandingan" },
  { href: "/hasil", label: "Hasil & Ranking" },
];

export default function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const isLoginPage = path === "/login";

  const doLogout = async () => {
    if (!confirm("Yakin ingin keluar?")) return;
    setBusy(true);
    await logout();
    setBusy(false);
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-white/80 shadow-[0_8px_30px_-18px_rgba(2,132,199,0.5)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href={user ? "/" : "/login"} className="mr-2 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-sky-500/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="3" />
              <line x1="12" y1="22" x2="12" y2="8" />
              <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-extrabold tracking-tight text-slate-900">
              AHP <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">Shipyard</span>
            </span>
            <span className="block text-[11px] font-medium text-slate-500">Decision System • Shipbuilding</span>
          </span>
        </Link>

        {user && !isLoginPage && (
          <nav className="flex flex-wrap gap-1.5">
            {MENUS.map((m) => {
              const active = path === m.href;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  {m.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <span className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
          ) : user ? (
            <>
              <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 text-xs font-bold text-slate-700 sm:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-[10px] text-white">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
                {user.username}
              </span>
              <button
                onClick={doLogout}
                disabled={busy}
                className="group inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-[13px] font-bold text-red-600 transition hover:-translate-y-px hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-500/30 disabled:opacity-60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {busy ? "Keluar…" : "Keluar"}
              </button>
            </>
          ) : (
            !isLoginPage && (
              <Link
                href="/login"
                className="rounded-full bg-slate-900 px-4 py-1.5 text-[13px] font-bold text-white shadow-md transition hover:-translate-y-px hover:bg-sky-700"
              >
                Masuk
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
