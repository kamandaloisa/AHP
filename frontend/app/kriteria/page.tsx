"use client";

import { useState } from "react";
import { useSPKStore, uid } from "../../lib/store";
import { useRequireAuth } from "../../lib/auth";
import BackButton from "../../components/BackButton";
import { resizeMatrix } from "../../lib/ahp";

export default function KriteriaPage() {
  const { store, setStore, ready, pushToBackend, syncing } = useSPKStore();
  const { user, authLoading } = useRequireAuth();
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState<"benefit" | "cost">("benefit");
  const [ket, setKet] = useState("");

  if (authLoading || !user) return <p>Memuat...</p>;
  if (!ready) return <p>Memuat...</p>;

  const add = () => {
    if (!nama.trim()) return alert("Nama kriteria wajib diisi");
    if (store.kriteria.length >= 10) return alert("Maksimal 10 kriteria (batas RI)");
    const id = uid("k");
    const kriteria = [...store.kriteria, { id, nama: nama.trim(), jenis, keterangan: ket.trim() }];
    const pairwiseKriteria = resizeMatrix(store.pairwiseKriteria, kriteria.length);
    const pairwiseAlternatif = { ...store.pairwiseAlternatif, [id]: Array.from({ length: store.alternatif.length }, () => Array(store.alternatif.length).fill(1)) };
    setStore({ ...store, kriteria, pairwiseKriteria, pairwiseAlternatif });
    setNama(""); setKet("");
  };

  const remove = (id: string) => {
    if (!confirm("Hapus kriteria ini? Matriks perbandingannya ikut terhapus.")) return;
    const idx = store.kriteria.findIndex((k) => k.id === id);
    const kriteria = store.kriteria.filter((k) => k.id !== id);
    const pairwiseKriteria = store.pairwiseKriteria
      .filter((_, i) => i !== idx)
      .map((row) => row.filter((_, j) => j !== idx));
    const pairwiseAlternatif = { ...store.pairwiseAlternatif };
    delete pairwiseAlternatif[id];
    setStore({ ...store, kriteria, pairwiseKriteria, pairwiseAlternatif });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <BackButton href="/" label="Dashboard" />
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Data Kriteria</h1>
          <p className="text-sm text-slate-500">Harga, kualitas welding, waktu, kapasitas galangan, reputasi… (maks 10)</p>
        </div>
        <button onClick={async () => { const ok = await pushToBackend(); alert(ok ? "Tersimpan ke backend ✓" : "Backend offline — tersimpan lokal"); }} disabled={syncing} className="btn-ghost disabled:opacity-60">
          {syncing ? "Menyimpan…" : "⬆ Simpan ke Backend"}
        </button>
      </div>

      <div className="card grid gap-2 p-4 md:grid-cols-[1fr_220px_1fr_auto]">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama kriteria" className="input" />
        <select value={jenis} onChange={(e) => setJenis(e.target.value as "benefit" | "cost")} className="input">
          <option value="benefit">Benefit (makin besar makin baik)</option>
          <option value="cost">Cost (makin kecil makin baik)</option>
        </select>
        <input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Keterangan (opsional)" className="input" />
        <button onClick={add} className="btn-primary">+ Tambah</button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr><th className="px-4 py-2.5">No</th><th className="px-4 py-2.5">Nama</th><th className="px-4 py-2.5">Jenis</th><th className="px-4 py-2.5">Keterangan</th><th className="px-4 py-2.5">Aksi</th></tr>
          </thead>
          <tbody>
            {store.kriteria.map((k, i) => (
              <tr key={k.id} className="border-t border-slate-100 hover:bg-sky-50/40">
                <td className="px-4 py-2.5 font-mono text-slate-400">{i + 1}</td>
                <td className="px-4 py-2.5 font-semibold">{k.nama}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${k.jenis === "benefit" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{k.jenis}</span></td>
                <td className="px-4 py-2.5 text-slate-500">{k.keterangan}</td>
                <td className="px-4 py-2.5"><button onClick={() => remove(k.id)} className="rounded-lg px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-50">Hapus</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
