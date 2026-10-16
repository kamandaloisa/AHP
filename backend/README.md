# AHP Shipyard Decision System — Backend

Backend siap pakai: **Express + SQLite bawaan Node** (tanpa tools build native) + **auth token**.

## Login

User default dibuat otomatis saat server pertama jalan:

- username: `admin` · password: `admin123`
- Ubah via ENV `ADMIN_USER` / `ADMIN_PASS` di `.env` (berlaku untuk pembuatan user pertama).

Alur: `POST /api/auth/login` → dapat `token` → sertakan di setiap request:
`Authorization: Bearer <token>`. Logout: `POST /api/auth/logout`. Cek sesi: `GET /api/auth/me`.

Semua endpoint `/api/*` (kecuali `/api/health` & `/api/auth/login`) **wajib login**.

## Cara jalan cepat

```bash
cd backend
npm install
npm start
```

Buka: `http://localhost:5000/api/health`

Mode dev (auto-reload): `npm run dev`
Reset ke data contoh: `POST /api/reset` atau `npm run seed` sekali lalu `npm start`.

## Konfigurasi (.env)

| Key | Default | Keterangan |
|---|---|---|
| PORT | 5000 | Port server |
| DATABASE_PATH | ./data/spk.db | File SQLite |
| FRONTEND_URL | http://localhost:3000 | Untuk CORS |

## Endpoint

- `GET /api/health` (publik)
- `POST /api/auth/login` (publik) · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET /api/kriteria` · `POST /api/kriteria` · `DELETE /api/kriteria/:id`
- `GET /api/alternatif` · `POST /api/alternatif` · `DELETE /api/alternatif/:id`
- `GET /api/penilaian/kriteria` · `PUT /api/penilaian/kriteria {matrix}`
- `GET /api/penilaian/alternatif/:kriteriaId` · `PUT ... {matrix}`
- `GET /api/hasil` — bobot, skor global, ranking, CR/CI/λmax
- `GET /api/export` — dump semua data + hasil
- `POST /api/import` — terima full-state dari frontend (sinkron 1 klik)
- `POST /api/reset` — kembalikan ke contoh galangan kapal

Semua matriks divalidasi resiprokal otomatis (a_ji = 1/a_ij) dan CR dihitung server-side.
