# AHP Shipyard Decision System — Siap Pakai (Login + Backend + Grafik)

Sistem Pendukung Keputusan metode **AHP** untuk pemilihan **galangan kapal**,
lengkap dengan **login**, **backend Express + SQLite**, **dashboard bergrafik**, dan uji konsistensi (CI, CR, λmax).

> **Login default:** username `admin` · password `admin123`
> (dibuat otomatis; ubah via `ADMIN_USER` / `ADMIN_PASS` di `backend/.env`).

## 1. Cara jalan cepat (2 terminal)

**Terminal 1 — backend (http://localhost:5000):**
```bash
cd backend
npm install
npm start
```

**Terminal 2 — frontend (http://localhost:3000):**
```bash
cd frontend
npm install
npm run dev
```

Atau dari folder root:
```bash
npm run install:all
npm run start:backend   # terminal 1
npm run dev:frontend    # terminal 2
```

> Frontend otomatis memakai `NEXT_PUBLIC_API_URL` (lihat `frontend/.env.local`).
> Bila backend mati, aplikasi tetap jalan dalam **mode lokal** (localStorage) + badge status di dashboard.

## 2. Fitur

- **Backend siap pakai** (`backend/`): Express + SQLite bawaan Node (tanpa build tools)
  - CRUD kriteria & alternatif, matriks pairwise resiprokal otomatis
  - Perhitungan AHP server-side: priority vector, λmax, CI, CR, skor global, ranking
  - Endpoint: `/api/health`, `/api/kriteria`, `/api/alternatif`, `/api/penilaian/*`,
    `/api/hasil`, `/api/export`, `/api/import`, `/api/reset`
- **Dashboard diperbagus + grafik SVG** (tanpa library berat):
  - Hero gradient + status backend + tombol sinkron
  - 4 kartu statistik, **donut bobot kriteria**, **gauge CR**, **bar ranking**,
    **tren skor**, **radar 3 besar**, alur 4 langkah
- **Halaman Hasil**: pemenang gradient, grafik ranking, donut, radar, tabel sintesis
- **Sinkronisasi 1 klik**: tiap halaman ada tombol “Sinkron / Simpan ke Backend”

## 3. Struktur

```
C:\spk
├── backend/        # Express + SQLite (server.js, data/spk.db, .env)
├── frontend/       # Next.js: app/, components/Charts.tsx, lib/api.ts, lib/store.ts
├── package.json    # script gabungan
└── README.md
```

## 4. Konfigurasi

| File | Isi |
|---|---|
| `backend/.env` | `PORT`, `DATABASE_PATH`, `FRONTEND_URL` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:5000` |

## 5. API backend (ringkas — semua wajib login kecuali health & login)

| Method | Endpoint | Body |
|---|---|---|
| GET | `/api/health` (publik) | — |
| POST | `/api/auth/login` (publik) | `{username, password}` → `{token}` |
| POST | `/api/auth/logout` | — (header `Authorization: Bearer <token>`) |
| GET | `/api/auth/me` | — |
| GET/POST/DELETE | `/api/kriteria`, `/api/kriteria/:id` | `{nama, jenis, keterangan}` |
| GET/POST/DELETE | `/api/alternatif`, `/api/alternatif/:id` | `{nama, keterangan}` |
| GET/PUT | `/api/penilaian/kriteria` | `{matrix}` |
| GET/PUT | `/api/penilaian/alternatif/:kriteriaId` | `{matrix}` |
| GET | `/api/hasil` | bobot + ranking + CR |
| GET | `/api/export` | dump semua + hasil |
| POST | `/api/import` | full-state dari frontend |
| POST | `/api/reset` | kembali ke contoh awal |

## 6. Build produksi

```bash
npm run build
npm run start:frontend
```
