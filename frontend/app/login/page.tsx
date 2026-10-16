"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (!loading && user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Isi username dan password dulu.");
      return;
    }
    setBusy(true);
    setError("");
    const r = await login(username.trim(), password);
    setBusy(false);
    if (r.ok) router.replace("/");
    else setError(r.error || "Login gagal — periksa koneksi backend.");
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
      <div className="card grid w-full overflow-hidden md:grid-cols-2">
        {/* Panel kiri */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-8 text-white md:flex">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="relative">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="3" />
                <line x1="12" y1="22" x2="12" y2="8" />
                <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
              </svg>
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight">
              AHP Shipyard<br />Decision System
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Masuk untuk mengelola kriteria, penilaian AHP, dan ranking galangan kapal.
            </p>
          </div>
          <ul className="relative space-y-2 text-xs text-slate-300">
            {["Perbandingan berpasangan skala Saaty", "Uji konsistensi CR ≤ 0.1 otomatis", "Grafik bobot & ranking real-time"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Form kanan */}
        <form onSubmit={submit} className="p-6 md:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Selamat datang kembali</h2>
          <p className="mt-0.5 text-sm text-slate-500">Masuk ke akun kamu untuk lanjut.</p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="cth: admin"
              autoComplete="username"
              className="input mt-1.5 normal-case"
            />
          </label>
          <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="input mt-1.5"
            />
          </label>

          <button type="submit" disabled={busy} className="btn-primary mt-5 w-full disabled:opacity-60">
            {busy ? "Memeriksa…" : "Masuk →"}
          </button>

          <div className="mt-4 rounded-xl bg-sky-50 px-3.5 py-2.5 text-xs leading-relaxed text-sky-800">
            <p className="font-bold">Akun default (ubah di backend/.env):</p>
            <p className="font-mono">admin / admin123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
