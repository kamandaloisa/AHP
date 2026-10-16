"use client";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const TOKEN_KEY = "ahp-shipyard-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string }).error || `HTTP ${res.status}`;
    if (res.status === 401) setToken(null);
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export type AuthUser = { username: string; role: string };
export type LoginResult = { token: string; username: string; role: string };

export type BackendExport = {
  data: {
    kriteria: { id: string; nama: string; jenis: "benefit" | "cost"; keterangan: string }[];
    alternatif: { id: string; nama: string; keterangan: string }[];
    matriks: Record<string, number[][]>;
    hasil: BackendHasil;
  };
};

export type BackendHasil = {
  kriteria: { id: string; nama: string }[];
  alternatif: { id: string; nama: string }[];
  bobotKriteria: { priority: number[]; lambdaMax: number; ci: number; cr: number; consistent: boolean };
  perKriteria: { kriteriaId: string; nama: string; priority: number[]; cr: number; consistent: boolean }[];
  skor: { alternatifId: string; nama: string; skor: number }[];
  ranking: { id: string; nama: string; keterangan: string; skor: number; peringkat: number }[];
  konsistenSemua: boolean;
};

export const api = {
  health: () => req<{ ok: boolean }>("/api/health"),
  auth: {
    login: async (username: string, password: string) => {
      const res = await req<{ data: LoginResult }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setToken(res.data.token);
      return res.data;
    },
    logout: async () => {
      try {
        await req<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
      } finally {
        setToken(null);
      }
    },
    me: () => req<{ data: AuthUser }>("/api/auth/me"),
  },
  export: () => req<BackendExport>("/api/export"),
  hasil: () => req<{ data: BackendHasil }>("/api/hasil"),
  reset: () => req<{ ok: boolean }>("/api/reset", { method: "POST" }),
  importAll: (payload: {
    kriteria: unknown[];
    alternatif: unknown[];
    pairwiseKriteria: number[][];
    pairwiseAlternatif: Record<string, number[][]>;
  }) => req<{ ok: boolean }>("/api/import", { method: "POST", body: JSON.stringify(payload) }),
};
