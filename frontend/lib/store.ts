"use client";

import { useEffect, useState } from "react";
import type { Alternatif, Kriteria } from "./types";
import { makeIdentityPairwise, resizeMatrix } from "./ahp";

const STORAGE_KEY = "spk-ahp-shipbuilding-v1";

export const DEFAULT_KRITERIA: Kriteria[] = [
  { id: "k1", nama: "Harga Penawaran", jenis: "cost", keterangan: "Total biaya pembangunan / repair kapal" },
  { id: "k2", nama: "Kualitas Material & Welding", jenis: "benefit", keterangan: "Grade plat, pengelasan, QC & klasifikasi (BKI/LR/ABS)" },
  { id: "k3", nama: "Waktu Penyelesaian", jenis: "cost", keterangan: "Durasi docking / building sampai delivery" },
  { id: "k4", nama: "Kapasitas & Fasilitas Galangan", jenis: "benefit", keterangan: "Dockyard, crane, slipway, tenaga ahli" },
  { id: "k5", nama: "Reputasi & Pengalaman", jenis: "benefit", keterangan: "Portofolio kapal, testimoni owner, sertifikasi" },
];

export const DEFAULT_ALTERNATIF: Alternatif[] = [
  { id: "a1", nama: "Meridian Dockyard", keterangan: "Contoh: galangan besar, kapasitas 50.000 DWT" },
  { id: "a2", nama: "Harborline Marine", keterangan: "Contoh: galangan menengah, spesialis repair" },
  { id: "a3", nama: "Seaborn Heavy Industries", keterangan: "Contoh: galangan baru, harga kompetitif" },
  { id: "a4", nama: "Northbay Shipworks", keterangan: "Contoh: berpengalaman kapal niaga" },
];

// Migrasi nama contoh lama -> baru (data custom pengguna tidak tersentuh)
const LEGACY_NAMES: Record<string, { nama: string; keterangan: string }> = {
  "Galangan A — Nusantara Steel": { nama: "Meridian Dockyard", keterangan: "Contoh: galangan besar, kapasitas 50.000 DWT" },
  "Galangan B — Samudra Biru": { nama: "Harborline Marine", keterangan: "Contoh: galangan menengah, spesialis repair" },
  "Galangan C — Cakra Bahari": { nama: "Seaborn Heavy Industries", keterangan: "Contoh: galangan baru, harga kompetitif" },
  "Galangan D — Lintas Samudra": { nama: "Northbay Shipworks", keterangan: "Contoh: berpengalaman kapal niaga" },
};

function migrateLegacyNames(list: Alternatif[]): Alternatif[] {
  return list.map((a) => {
    const neu = LEGACY_NAMES[a.nama];
    return neu ? { ...a, nama: neu.nama, keterangan: neu.keterangan } : a;
  });
}

// Contoh realistis: Harga sedikit di bawah Kualitas, dst.
// Dibuat mendekati konsisten (CR < 0.1)
export const SAMPLE_KRITERIA_MATRIX: number[][] = [
  [1, 1 / 2, 2, 3, 4],
  [2, 1, 3, 4, 5],
  [1 / 2, 1 / 3, 1, 2, 3],
  [1 / 3, 1 / 4, 1 / 2, 1, 2],
  [1 / 4, 1 / 5, 1 / 3, 1 / 2, 1],
];

export type Store = {
  kriteria: Kriteria[];
  alternatif: Alternatif[];
  pairwiseKriteria: number[][];
  pairwiseAlternatif: Record<string, number[][]>;
};

function buildDefaultStore(): Store {
  const pairwiseAlternatif: Record<string, number[][]> = {};
  for (const k of DEFAULT_KRITERIA) {
    pairwiseAlternatif[k.id] = makeIdentityPairwise(DEFAULT_ALTERNATIF.length);
  }
  return {
    kriteria: DEFAULT_KRITERIA,
    alternatif: DEFAULT_ALTERNATIF,
    pairwiseKriteria: SAMPLE_KRITERIA_MATRIX,
    pairwiseAlternatif,
  };
}

export function loadStore(): Store {
  if (typeof window === "undefined") return buildDefaultStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultStore();
    const parsed = JSON.parse(raw) as Store;
    // validasi ringan + resize matriks bila jumlah berubah
    const nk = parsed.kriteria.length;
    const na = parsed.alternatif.length;
    const pk = resizeMatrix(parsed.pairwiseKriteria ?? [], nk);
    const pa: Record<string, number[][]> = {};
    for (const k of parsed.kriteria) {
      pa[k.id] = resizeMatrix(parsed.pairwiseAlternatif?.[k.id] ?? [], na);
    }
    return { ...parsed, alternatif: migrateLegacyNames(parsed.alternatif), pairwiseKriteria: pk, pairwiseAlternatif: pa };
  } catch {
    return buildDefaultStore();
  }
}

export function saveStore(s: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // abaikan quota error
  }
}

export function useSPKStore() {
  const [store, setStore] = useState<Store>(() => buildDefaultStore());
  const [ready, setReady] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Coba ambil dari backend dulu (siap pakai lintas device)
      try {
        const { api } = await import("./api");
        const exp = await api.export();
        if (!cancelled && exp?.data?.kriteria?.length) {
          const kriteria = exp.data.kriteria;
          const alternatif = migrateLegacyNames(exp.data.alternatif);
          const pairwiseKriteria = resizeMatrix(exp.data.matriks?.kriteria ?? [], kriteria.length);
          const pairwiseAlternatif: Record<string, number[][]> = {};
          for (const k of kriteria) {
            pairwiseAlternatif[k.id] = resizeMatrix(exp.data.matriks?.[`alt:${k.id}`] ?? [], alternatif.length);
          }
          setStore({ kriteria, alternatif, pairwiseKriteria, pairwiseAlternatif });
          setBackendOnline(true);
          setReady(true);
          return;
        }
      } catch {
        // backend mati -> fallback localStorage
      }
      if (cancelled) return;
      setStore(loadStore());
      setBackendOnline(false);
      setReady(true);
      // tandai offline hanya jika fetch gagal; cek ulang health agar akurat
      try {
        const { api } = await import("./api");
        await api.health();
        if (!cancelled) setBackendOnline(true);
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) saveStore(store);
  }, [store, ready]);

  const pushToBackend = async () => {
    setSyncing(true);
    try {
      const { api } = await import("./api");
      await api.importAll({
        kriteria: store.kriteria,
        alternatif: store.alternatif,
        pairwiseKriteria: store.pairwiseKriteria,
        pairwiseAlternatif: store.pairwiseAlternatif,
      });
      setBackendOnline(true);
      return true;
    } catch {
      setBackendOnline(false);
      return false;
    } finally {
      setSyncing(false);
    }
  };

  return { store, setStore, ready, backendOnline, syncing, pushToBackend };
}

export function uid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;
}
