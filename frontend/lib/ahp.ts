import type { AHPResult } from "./types";

// Random Index (RI) Saaty
const RI: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.9,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

export function getRI(n: number): number {
  if (RI[n] !== undefined) return RI[n];
  return 1.49;
}

export function calcAHP(matrix: number[][]): AHPResult {
  const n = matrix.length;
  if (n === 0) {
    return { priority: [], lambdaMax: 0, ci: 0, cr: 0, consistent: true };
  }
  if (n === 1) {
    return { priority: [1], lambdaMax: 1, ci: 0, cr: 0, consistent: true };
  }

  // 1. Jumlah tiap kolom
  const colSum = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSum[j] += matrix[i][j];
    }
  }

  // 2. Normalisasi + rata-rata baris = priority vector
  const priority = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += matrix[i][j] / (colSum[j] || 1);
    }
    priority[i] = rowSum / n;
  }

  // 3. Weighted sum vector
  const weightedSum = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      weightedSum[i] += matrix[i][j] * priority[j];
    }
  }

  // 4. Lambda max
  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    if (priority[i] !== 0) lambdaMax += weightedSum[i] / priority[i];
  }
  lambdaMax = lambdaMax / n;

  // 5. CI & CR
  const ci = (lambdaMax - n) / (n - 1);
  const ri = getRI(n);
  const cr = ri === 0 ? 0 : ci / ri;

  return {
    priority,
    lambdaMax,
    ci: Math.max(0, ci),
    cr: Math.max(0, cr),
    consistent: cr <= 0.1,
  };
}

export function makeIdentityPairwise(n: number): number[][] {
  return Array.from({ length: n }, () => Array(n).fill(1));
}

export function resizeMatrix(
  old: number[][],
  newSize: number,
  defaultValue = 1
): number[][] {
  const m: number[][] = Array.from({ length: newSize }, (_, i) =>
    Array.from({ length: newSize }, (_, j) => {
      if (i === j) return 1;
      if (old[i] && old[i][j] !== undefined) return old[i][j];
      // jaga reciprocal bila pasangan kebalikannya ada
      if (old[j] && old[j][i] !== undefined && old[j][i] !== 0) {
        return 1 / old[j][i];
      }
      return defaultValue;
    })
  );
  // paksa reciprocal konsisten
  for (let i = 0; i < newSize; i++) {
    for (let j = 0; j < newSize; j++) {
      if (i === j) m[i][j] = 1;
      else if (i < j) {
        if (m[i][j] === 0) m[i][j] = 1;
        m[j][i] = 1 / m[i][j];
      }
    }
  }
  return m;
}

// Skala Saaty untuk dropdown
export const SAATY_SCALE = [
  { value: 9, label: "9 - Mutlak lebih penting" },
  { value: 8, label: "8 - Antara 7 dan 9" },
  { value: 7, label: "7 - Sangat lebih penting" },
  { value: 6, label: "6 - Antara 5 dan 7" },
  { value: 5, label: "5 - Lebih penting" },
  { value: 4, label: "4 - Antara 3 dan 5" },
  { value: 3, label: "3 - Sedikit lebih penting" },
  { value: 2, label: "2 - Antara 1 dan 3" },
  { value: 1, label: "1 - Sama penting" },
  { value: 1 / 2, label: "1/2 - Kebalikan dari 2" },
  { value: 1 / 3, label: "1/3 - Kebalikan dari 3" },
  { value: 1 / 4, label: "1/4 - Kebalikan dari 4" },
  { value: 1 / 5, label: "1/5 - Kebalikan dari 5" },
  { value: 1 / 6, label: "1/6 - Kebalikan dari 6" },
  { value: 1 / 7, label: "1/7 - Kebalikan dari 7" },
  { value: 1 / 8, label: "1/8 - Kebalikan dari 8" },
  { value: 1 / 9, label: "1/9 - Kebalikan dari 9" },
];
