"use client";

import { useState } from "react";
import { useSPKStore, uid } from "../../lib/store";
import { useRequireAuth } from "../../lib/auth";
import BackButton from "../../components/BackButton";
import { resizeMatrix } from "../../lib/ahp";

export default function AlternatifPage() {
  const { store, setStore, ready, pushToBackend, syncing } = useSPKStore();
  const { user, authLoading } = useRequireAuth();
  const [nama, setNama] = useState("");
  const [ket, setKet] = useState("");

  if (authLoading || !user) return <p>Memuat...</p>;
  if (!ready) return <p>Memuat...</p>;

  const add = () => {
    if (!nama.trim()) return alert("Nama alternatif wajib diisi");
    if (store.alternatif.length >= 10) return alert("Maksimal 10 alternatif");
    const id = uid("a");
    const alternatif = [...store.alternatif, { id, nama: nama.trim(), keterangan: ket.trim() }];
    const pairwiseAlternatif: Record<string, number[][]> = {};
    for (const k of store.kriteria) {
      pairwiseAlternatif[k.id] = resizeMatrix(store.pairwiseAlternatif[k.id] ?? [], alternatif.length);
    }
    setStore({ ...store, alternatif, pairwiseAlternatif });
    setNama(""); setKet("");
  };

  const remove = (id: string) => {
    if (!confirm("Hapus alternatif ini?")) return;
    const idx = store.alternatif.findIndex((a) => a.id === id);
    const alternatif = store.alternatif.filter((a) => a.id !== id);
    const pairwiseAlternatif: Record<string, number[][]> = {};
    for (const k of store.kriteria) {
      const m = store.pairwiseAlternatif[k.id] ?? [];
      pairwiseAlternatif[k.id] = m.filter((_, i) => i !== idx).map((row) => row.filter((_, j) => j !== idx));
    }
    setStore({ ...store, alternatif, pairwiseAlternatif });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <BackButton href="/" label="Dashboard" />
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Data Alternatif</h1>
          <p className="text-sm text-slate-500">Daftar galangan / supplier / jenis kapal yang dinilai (maks 10)</p>
        </div>
        <button onClick={async () => { const ok = await pushToBackend(); alert(ok ? "Tersimpan ke backend ✓" : "Backend offline — tersimpan lokal"); }} disabled={syncing} className="btn-ghost disabled:opacity-60">
          {syncing ? "Menyimpan…" : "⬆ Simpan ke Backend"}
        </button>
      </div>

      <div className="card grid gap-2 p-4 md:grid-cols-[1fr_1fr_auto]">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama galangan / supplier" className="input" />
        <input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Keterangan (kapasitas, lokasi, dsb)" className="input" />
        <button onClick={add} className="btn-primary">+ Tambah</button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {store.alternatif.map((a, i) => (
          <div key={a.id} className="card card-hover flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-extrabold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-800">{a.nama}</p>
              <p className="truncate text-xs text-slate-500">{a.keterangan || "—"}</p>
            </div>
            <button onClick={() => remove(a.id)} className="rounded-lg px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-50">Hapus</button>
          </div>
        ))}
      </div>
    </div>
  );
}
