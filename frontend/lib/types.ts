export type Kriteria = {
  id: string;
  nama: string;
  jenis: "benefit" | "cost";
  keterangan: string;
};

export type Alternatif = {
  id: string;
  nama: string;
  keterangan: string;
};

export type AHPResult = {
  priority: number[];
  lambdaMax: number;
  ci: number;
  cr: number;
  consistent: boolean;
};

export type HasilAkhir = {
  alternatifId: string;
  nama: string;
  skor: number;
  peringkat: number;
};
