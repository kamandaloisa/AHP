"use client";

import Link from "next/link";
import { useSPKStore } from "../../lib/store";
import { useRequireAuth } from "../../lib/auth";
import BackButton from "../../components/BackButton";
import { calcAHP } from "../../lib/ahp";
import { DonutChart, PALETTE, RadarChart, RankingBars } from "../../components/Charts";

export default function HasilPage() {
  const { store, ready } = useSPKStore();
  const { user, authLoading } = useRequireAuth();

  if (authLoading || !user) return <p>Memuat...</p>;

  if (!ready) return <p>Memuat...</p>;
  if (store.kriteria.length < 2 || store.alternatif.length < 2)
    return (
      <div className="card p-6 text-sm">
        Lengkapi kriteria & alternatif + perbandingan dulu.{" "}
        <Link href="/kriteria" className="font-semibold text-sky-600 hover:underline">Ke menu Kriteria →</Link>
      </div>
    );

  const wKriteria = calcAHP(store.pairwiseKriteria);
  const localPerKriteria = store.kriteria.map((k) => ({
    kriteria: k,
    ahp: calcAHP(store.pairwiseAlternatif[k.id] ?? []),
  }));
  const skor = store.alternatif.map((_, i) => {
    let s = 0;
    localPerKriteria.forEach((lk, k) => {
      s += (wKriteria.priority[k] ?? 0) * (lk.ahp.priority[i] ?? 0);
    });
    return s;
  });
  const ranking = store.alternatif
    .map((a, i) => ({ id: a.id, nama: a.nama, keterangan: a.keterangan, skor: skor[i] ?? 0 }))
    .sort((x, y) => y.skor - x.skor)
    .map((r, idx) => ({ ...r, peringkat: idx + 1 }));

  const semuaKonsisten = wKriteria.consistent && localPerKriteria.every((l) => l.ahp.consistent);
  const pemenang = ranking[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Hasil & Ranking</h1>
          <p className="text-sm text-slate-500">Sintesis global + grafik + tabel keputusan</p>
        </div>
        <BackButton href="/" label="Dashboard" />
      </div>

      {!semuaKonsisten && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Ada matriks yang <b>tidak konsisten (CR &gt; 0.1)</b>. Perbaiki dulu di{" "}
          <Link href="/perbandingan" className="font-bold underline">menu Perbandingan</Link> agar hasil valid secara AHP.
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-extrabold">#{pemenang.peringkat}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">Rekomendasi terbaik</p>
            <p className="truncate text-xl font-extrabold md:text-2xl">{pemenang.nama}</p>
            <p className="text-sm text-white/85">Skor global {pemenang.skor.toFixed(4)} • {pemenang.keterangan}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="font-extrabold text-slate-900">Grafik Ranking</h2>
          <p className="mb-3 text-xs text-slate-500">Visual perbandingan skor akhir semua alternatif</p>
          <RankingBars
            data={ranking.map((r, i) => ({
              label: r.nama,
              sub: r.keterangan,
              value: r.skor,
              color: PALETTE[i % PALETTE.length],
              badge: i === 0 ? "PEMENANG" : undefined,
            }))}
            maxRows={10}
          />
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-extrabold text-slate-900">Bobot Kriteria</h2>
          <p className="mb-3 text-xs text-slate-500">CR = {wKriteria.cr.toFixed(4)} {wKriteria.consistent ? "✓" : "✗"}</p>
          <DonutChart
            data={store.kriteria.map((k, i) => ({
              label: k.nama,
              value: wKriteria.priority[i] ?? 0,
              color: PALETTE[i % PALETTE.length],
            }))}
            size={170}
            thickness={26}
          />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-extrabold text-slate-900">Radar Perbandingan 3 Besar</h2>
        <p className="mb-2 text-xs text-slate-500">Nilai prioritas lokal tiap alternatif di tiap kriteria</p>
        <RadarChart
          labels={store.kriteria.map((k) => k.nama)}
          series={ranking.slice(0, 3).map((r) => {
            const idx = store.alternatif.findIndex((a) => a.id === r.id);
            return {
              label: r.nama,
              values: localPerKriteria.map((lk) => lk.ahp.priority[idx] ?? 0),
              color: PALETTE[ranking.indexOf(r) % PALETTE.length],
            };
          })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5 text-sm">
          <h2 className="font-extrabold text-slate-900">Bobot kriteria (W)</h2>
          <ul className="mt-2 space-y-1">
            {store.kriteria.map((k, i) => (
              <li key={k.id} className="flex justify-between border-b border-slate-100 py-1.5 last:border-0">
                <span>{k.nama}</span><span className="font-mono font-bold">{(wKriteria.priority[i] ?? 0).toFixed(4)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5 text-sm">
          <h2 className="font-extrabold text-slate-900">Detail perhitungan</h2>
          <p>λmax kriteria = {wKriteria.lambdaMax.toFixed(4)}</p>
          <p>CI = {wKriteria.ci.toFixed(4)} • CR = {wKriteria.cr.toFixed(4)}</p>
          <p className="mt-2 text-xs text-slate-500">Normalisasi kolom → rata-rata baris = prioritas. λmax = rata-rata (weighted-sum / prioritas). CI = (λmax − n)/(n − 1). CR = CI / RI.</p>
          <div className="mt-2 space-y-1">
            {localPerKriteria.map((lk) => (
              <p key={lk.kriteria.id} className="text-xs">CR [{lk.kriteria.nama}] = {lk.ahp.cr.toFixed(4)} {lk.ahp.consistent ? "✓" : "✗"}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-center text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2.5 text-left">Alternatif \ Kriteria</th>
              {store.kriteria.map((k) => <th key={k.id} className="px-2 py-2.5">{k.nama}<br /><span className="font-mono text-sky-600">({(wKriteria.priority[store.kriteria.indexOf(k)] ?? 0).toFixed(3)})</span></th>)}
              <th className="px-3 py-2.5">Skor Akhir</th>
            </tr>
          </thead>
          <tbody>
            {store.alternatif.map((a, i) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-sky-50/40">
                <td className="px-3 py-2 text-left font-medium">{a.nama}</td>
                {localPerKriteria.map((lk) => (
                  <td key={lk.kriteria.id} className="px-2 py-2 font-mono">{(lk.ahp.priority[i] ?? 0).toFixed(3)}</td>
                ))}
                <td className="px-3 py-2 font-mono font-bold">{(skor[i] ?? 0).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
