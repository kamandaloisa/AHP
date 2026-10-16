"use client";

import Link from "next/link";
import { useSPKStore } from "../lib/store";
import { useRequireAuth } from "../lib/auth";
import { calcAHP } from "../lib/ahp";
import { ConsistencyGauge, DonutChart, MiniTrend, PALETTE, RadarChart, RankingBars } from "../components/Charts";

function StatCard({ title, value, sub, accent, icon }: { title: string; value: string; sub: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="card card-hover animate-fadeUp p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-white ${accent}`}>{icon}</span>
      </div>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const { store, ready, backendOnline, syncing, pushToBackend } = useSPKStore();
  const { user, authLoading } = useRequireAuth();

  if (authLoading || !user) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse p-4">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse p-4">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  const nk = store.kriteria.length;
  const na = store.alternatif.length;
  const ahpK = calcAHP(store.pairwiseKriteria);
  const perKriteria = store.kriteria.map((k) => ({
    kriteria: k,
    ahp: calcAHP(store.pairwiseAlternatif[k.id] ?? []),
  }));
  const skor = store.alternatif.map((_, i) => {
    let s = 0;
    perKriteria.forEach((lk, kk) => {
      s += (ahpK.priority[kk] ?? 0) * (lk.ahp.priority[i] ?? 0);
    });
    return s;
  });
  const ranking = store.alternatif
    .map((a, i) => ({ ...a, skor: skor[i] ?? 0 }))
    .sort((x, y) => y.skor - x.skor)
    .map((r, idx) => ({ ...r, peringkat: idx + 1 }));
  const pemenang = ranking[0];
  const konsistenSemua = ahpK.consistent && perKriteria.every((p) => p.ahp.consistent);

  const donutData = store.kriteria.map((k, i) => ({
    label: k.nama,
    value: ahpK.priority[i] ?? 0,
    color: PALETTE[i % PALETTE.length],
  }));
  const rankingBars = ranking.map((r, i) => ({
    label: r.nama,
    sub: r.keterangan,
    value: r.skor,
    color: PALETTE[i % PALETTE.length],
    badge: i === 0 ? "TERBAIK" : undefined,
  }));
  const radarSeries = ranking.slice(0, 3).map((r) => {
    const idxAsli = store.alternatif.findIndex((a) => a.id === r.id);
    return {
      label: r.nama,
      values: perKriteria.map((lk) => lk.ahp.priority[idxAsli] ?? 0),
      color: PALETTE[ranking.indexOf(r) % PALETTE.length],
    };
  });

  return (
    <div className="space-y-5">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-2xl shadow-sky-900/30 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <svg className="pointer-events-none absolute bottom-0 right-0 hidden w-[420px] opacity-20 md:block" viewBox="0 0 400 160" fill="none" stroke="#7dd3fc" strokeWidth={2}>
          <path d="M10 110 L60 110 L75 70 L95 70 L110 110 L180 110 L195 60 L225 60 L240 110 L390 110 L360 140 L40 140 Z" />
          <path d="M0 145 H400" strokeDasharray="6 6" />
        </svg>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                backendOnline ? "bg-emerald-400/20 text-emerald-200" : backendOnline === false ? "bg-amber-400/20 text-amber-200" : "bg-white/10 text-slate-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${backendOnline ? "bg-emerald-400" : "bg-amber-400"}`} />
              {backendOnline ? "Backend terhubung" : backendOnline === false ? "Mode lokal (backend offline)" : "Menghubungkan…"}
            </span>
            {!konsistenSemua && (
              <span className="rounded-full bg-red-400/20 px-3 py-1 text-[11px] font-bold text-red-200">
                Ada CR &gt; 0.1 — perlu perbaikan
              </span>
            )}
            {konsistenSemua && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-sky-200">
                Semua matriks konsisten ✓
              </span>
            )}
          </div>
          <h1 className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">
            AHP Shipyard <span className="bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">Decision System</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Pilih galangan / supplier kapal terbaik dengan perbandingan berpasangan skala Saaty 1–9,
            lengkap dengan uji konsistensi (CI, CR, λmax), grafik bobot & ranking, dan backend siap pakai.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/perbandingan" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              Mulai Perbandingan →
            </Link>
            <Link href="/hasil" className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Lihat Hasil & Ranking
            </Link>
            <button
              onClick={async () => {
                const ok = await pushToBackend();
                alert(ok ? "Berhasil disinkron ke backend ✓" : "Backend tidak terjangkau — data tetap aman di browser");
              }}
              disabled={syncing}
              className="rounded-xl border border-sky-300/30 bg-sky-400/15 px-5 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/25 disabled:opacity-60"
            >
              {syncing ? "Menyinkron…" : "⬆ Sinkron ke Backend"}
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Kriteria"
          value={String(nk)}
          sub={`${store.kriteria.filter((k) => k.jenis === "benefit").length} benefit • ${store.kriteria.filter((k) => k.jenis === "cost").length} cost`}
          accent="bg-gradient-to-br from-sky-500 to-blue-600"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" /></svg>}
        />
        <StatCard
          title="Alternatif"
          value={String(na)}
          sub="Galangan / supplier kapal"
          accent="bg-gradient-to-br from-violet-500 to-indigo-600"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M3 21h18M5 21V10l7-6 7 6v11" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        />
        <StatCard
          title="CR Kriteria"
          value={ahpK.cr.toFixed(3)}
          sub={ahpK.consistent ? "Konsisten ✓ — siap diranking" : "Tidak konsisten — perbaiki!"}
          accent={ahpK.consistent ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-red-500 to-rose-600"}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        />
        <StatCard
          title="Pemenang Sementara"
          value={pemenang ? `#${pemenang.peringkat}` : "-"}
          sub={pemenang ? `${pemenang.nama.slice(0, 30)} • ${pemenang.skor.toFixed(4)}` : "Belum ada data"}
          accent="bg-gradient-to-br from-amber-500 to-orange-600"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a1 1 0 00-1 1c0 2 1.5 3.5 4 3.5M17 6h3a1 1 0 011 1c0 2-1.5 3.5-4 3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        />
      </div>

      {/* GRAFIK UTAMA */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card animate-fadeUp p-5 lg:col-span-3">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold tracking-tight text-slate-900">Bobot Kriteria (Priority Vector)</h2>
              <p className="text-xs text-slate-500">Donut proporsi + λmax {ahpK.lambdaMax.toFixed(3)} • CI {ahpK.ci.toFixed(4)}</p>
            </div>
            <Link href="/perbandingan" className="text-xs font-bold text-sky-600 hover:underline">Ubah →</Link>
          </div>
          <DonutChart data={donutData} />
        </div>
        <div className="card animate-fadeUp p-5 lg:col-span-2">
          <h2 className="font-extrabold tracking-tight text-slate-900">Konsistensi (CR)</h2>
          <p className="mb-2 text-xs text-slate-500">Gauge 0 → 0.30 • batas konsisten 0.10</p>
          <ConsistencyGauge cr={ahpK.cr} />
          <div className="mt-3 space-y-1 border-t pt-3">
            {perKriteria.slice(0, 5).map((p) => (
              <div key={p.kriteria.id} className="flex items-center justify-between text-xs">
                <span className="truncate font-medium text-slate-600">{p.kriteria.nama}</span>
                <span className={`font-mono font-bold ${p.ahp.consistent ? "text-emerald-600" : "text-red-600"}`}>
                  {p.ahp.cr.toFixed(3)} {p.ahp.consistent ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card animate-fadeUp p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold tracking-tight text-slate-900">Ranking Alternatif (Skor Global)</h2>
              <p className="text-xs text-slate-500">Skor = Σ bobot-kriteria × prioritas-lokal</p>
            </div>
            <Link href="/hasil" className="text-xs font-bold text-sky-600 hover:underline">Detail →</Link>
          </div>
          <RankingBars data={rankingBars} />
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Tren skor peringkat 1 → {ranking.length}</p>
            <MiniTrend values={ranking.map((r) => r.skor)} />
          </div>
        </div>
        <div className="card animate-fadeUp p-5 lg:col-span-2">
          <h2 className="font-extrabold tracking-tight text-slate-900">Radar 3 Besar</h2>
          <p className="mb-2 text-xs text-slate-500">Profil kekuatan tiap alternatif per kriteria</p>
          <RadarChart labels={store.kriteria.map((k) => k.nama)} series={radarSeries} />
        </div>
      </div>

      {/* DAFTAR + ALUR */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-extrabold tracking-tight text-slate-900">Kriteria aktif</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {store.kriteria.map((k, i) => (
              <li key={k.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
                <span className="min-w-0 truncate">
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: PALETTE[i % PALETTE.length] }}>
                    {i + 1}
                  </span>
                  {k.nama} <span className="text-slate-400">({k.jenis})</span>
                </span>
                <span className="shrink-0 font-mono text-xs font-bold">{(ahpK.priority[i] ?? 0).toFixed(3)}</span>
              </li>
            ))}
          </ul>
          <Link href="/kriteria" className="mt-2 inline-block text-sm font-semibold text-sky-600 hover:underline">Kelola kriteria →</Link>
        </div>
        <div className="card p-5">
          <h2 className="font-extrabold tracking-tight text-slate-900">Alternatif (Galangan / Supplier)</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {store.alternatif.map((a, i) => (
              <li key={a.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
                <span className="min-w-0 truncate">{i + 1}. {a.nama}</span>
                <span className="shrink-0 font-mono text-xs font-bold text-slate-500">{(skor[i] ?? 0).toFixed(3)}</span>
              </li>
            ))}
          </ul>
          <Link href="/alternatif" className="mt-2 inline-block text-sm font-semibold text-sky-600 hover:underline">Kelola alternatif →</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {["Kriteria", "Alternatif", "Perbandingan", "Hasil"].map((s, i) => (
          <div key={s} className="card flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-extrabold text-white">{i + 1}</span>
            <div>
              <p className="text-sm font-bold text-slate-800">{s}</p>
              <p className="text-[11px] text-slate-400">{["Tentukan faktor", "Daftar kandidat", "Nilai pairwise + CR", "Ranking + grafik"][i]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
