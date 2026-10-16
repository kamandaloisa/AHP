"use client";

import { useSPKStore } from "../../lib/store";
import { useRequireAuth } from "../../lib/auth";
import BackButton from "../../components/BackButton";
import { SAATY_SCALE, calcAHP } from "../../lib/ahp";

function PairwiseEditor({
  labels,
  matrix,
  onChange,
}: {
  labels: string[];
  matrix: number[][];
  onChange: (m: number[][]) => void;
}) {
  const n = labels.length;

  const setVal = (i: number, j: number, v: number) => {
    const m = matrix.map((row) => [...row]);
    m[i][j] = v;
    m[j][i] = 1 / v;
    onChange(m);
  };

  if (n < 2) return <p className="text-sm text-slate-500">Butuh minimal 2 item untuk perbandingan.</p>;

  const pairs: { i: number; j: number }[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push({ i, j });

  const r = calcAHP(matrix);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {pairs.map(({ i, j }) => {
          const v = matrix[i][j];
          return (
            <div key={`${i}-${j}`} className="card grid items-center gap-2 p-3 text-sm md:grid-cols-[1fr_240px_1fr]">
              <div className="min-w-0 truncate font-semibold text-slate-700">{labels[i]}</div>
              <select
                value={String(v)}
                onChange={(e) => setVal(i, j, Number(e.target.value))}
                className="input"
              >
                {SAATY_SCALE.map((s) => (
                  <option key={s.label} value={String(s.value)}>{s.label}</option>
                ))}
              </select>
              <div className="min-w-0 truncate font-semibold text-slate-700 md:text-right">{labels[j]}</div>
            </div>
          );
        })}
      </div>

      <div className={`rounded-2xl border p-3.5 text-sm ${r.consistent ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
        <p className="font-bold">Bobot: [{r.priority.map((p) => p.toFixed(3)).join(", ")}]</p>
        <p className="mt-0.5 text-xs">λmax = {r.lambdaMax.toFixed(4)} • CI = {r.ci.toFixed(4)} • CR = {r.cr.toFixed(4)} → {r.consistent ? "KONSISTEN ✓ (CR ≤ 0.1)" : "TIDAK KONSISTEN — ubah penilaian!"}</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full bg-white text-center text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-2 py-2 text-left">Matriks</th>
              {labels.map((l, j) => <th key={j} className="px-2 py-2 font-mono text-slate-400">C{j + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="max-w-[180px] truncate px-2 py-1.5 text-left font-medium">{labels[i]}</td>
                {row.map((v, j) => (
                  <td key={j} className={`px-2 py-1.5 font-mono ${i === j ? "bg-sky-50/60 font-bold" : ""}`}>{v >= 1 ? v.toFixed(2) : `1/${(1 / v).toFixed(0)}`}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PerbandinganPage() {
  const { store, setStore, ready, pushToBackend, syncing } = useSPKStore();
  const { user, authLoading } = useRequireAuth();

  if (authLoading || !user) return <p>Memuat...</p>;

  if (!ready) return <p>Memuat...</p>;
  if (store.kriteria.length < 2) return <p className="text-sm">Tambahkan minimal 2 kriteria dulu di menu Kriteria.</p>;
  if (store.alternatif.length < 2) return <p className="text-sm">Tambahkan minimal 2 alternatif dulu di menu Alternatif.</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <BackButton href="/" label="Dashboard" />
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Perbandingan Berpasangan (AHP)</h1>
          <p className="text-sm text-slate-500">Skala Saaty • kebalikan otomatis • jaga CR ≤ 0.1 • auto-tersimpan + bisa sinkron backend</p>
        </div>
        <button onClick={async () => { const ok = await pushToBackend(); alert(ok ? "Penilaian tersinkron ke backend ✓" : "Backend offline — tersimpan lokal"); }} disabled={syncing} className="btn-primary disabled:opacity-60">
          {syncing ? "Menyinkron…" : "⬆ Sinkron ke Backend"}
        </button>
      </div>

      <section className="card space-y-3 p-5">
        <h2 className="font-extrabold text-slate-900">1. Antar Kriteria</h2>
        <PairwiseEditor
          labels={store.kriteria.map((k) => k.nama)}
          matrix={store.pairwiseKriteria}
          onChange={(m) => setStore({ ...store, pairwiseKriteria: m })}
        />
      </section>

      {store.kriteria.map((k, ki) => (
        <section key={k.id} className="card space-y-3 p-5">
          <h2 className="font-extrabold text-slate-900">{ki + 2}. Alternatif ditinjau dari: {k.nama} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">({k.jenis})</span></h2>
          <PairwiseEditor
            labels={store.alternatif.map((a) => a.nama)}
            matrix={store.pairwiseAlternatif[k.id] ?? []}
            onChange={(m) => setStore({ ...store, pairwiseAlternatif: { ...store.pairwiseAlternatif, [k.id]: m } })}
          />
        </section>
      ))}
    </div>
  );
}
