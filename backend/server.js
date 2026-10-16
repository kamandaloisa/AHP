/**
 * AHP Shipyard Decision System — Backend siap pakai
 * Express + SQLite bawaan Node (node:sqlite, tanpa native build)
 * Jalankan: npm install lalu npm start (http://localhost:5000)
 * Login default: admin / admin123 (ubah via ADMIN_USER & ADMIN_PASS di .env)
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 5000);
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "data", "spk.db");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

// ---------- AHP core (mirror frontend lib/ahp.ts) ----------
const RI_TABLE = { 1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
function getRI(n) {
  return RI_TABLE[n] !== undefined ? RI_TABLE[n] : 1.49;
}
function calcAHP(matrix) {
  const n = (matrix || []).length;
  if (n === 0) return { priority: [], lambdaMax: 0, ci: 0, cr: 0, consistent: true };
  if (n === 1) return { priority: [1], lambdaMax: 1, ci: 0, cr: 0, consistent: true };
  const colSum = Array(n).fill(0);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) colSum[j] += Number(matrix[i][j]) || 0;
  const priority = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) rowSum += (Number(matrix[i][j]) || 0) / (colSum[j] || 1);
    priority[i] = rowSum / n;
  }
  const weighted = Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) weighted[i] += (Number(matrix[i][j]) || 0) * priority[j];
  let lambdaMax = 0;
  for (let i = 0; i < n; i++) if (priority[i] !== 0) lambdaMax += weighted[i] / priority[i];
  lambdaMax /= n;
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
function makeIdentity(n) {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 1)));
}
function resizeMatrix(old, newSize) {
  const m = Array.from({ length: newSize }, (_, i) =>
    Array.from({ length: newSize }, (_, j) => {
      if (i === j) return 1;
      if (old && old[i] && old[i][j] !== undefined) return Number(old[i][j]) || 1;
      if (old && old[j] && old[j][i]) return 1 / (Number(old[j][i]) || 1);
      return 1;
    })
  );
  for (let i = 0; i < newSize; i++)
    for (let j = 0; j < newSize; j++) {
      if (i === j) m[i][j] = 1;
      else if (i < j) {
        if (!m[i][j]) m[i][j] = 1;
        m[j][i] = 1 / m[i][j];
      }
    }
  return m;
}
function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;
}

// ---------- DB schema + seed ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS kriteria (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    jenis TEXT NOT NULL DEFAULT 'benefit',
    keterangan TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS alternatif (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    keterangan TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS matriks (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    pass TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ---------- Auth helpers (scrypt bawaan Node, tanpa dependensi tambahan) ----------
function hashPassword(pw, salt = crypto.randomBytes(16).toString("hex")) {
  const h = crypto.scryptSync(String(pw), salt, 64).toString("hex");
  return `${salt}:${h}`;
}
function verifyPassword(pw, stored) {
  try {
    const [salt, h] = String(stored).split(":");
    if (!salt || !h) return false;
    const h2 = crypto.scryptSync(String(pw), salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(h2, "hex"));
  } catch {
    return false;
  }
}
function ensureAdminUser() {
  const ADMIN_USER = process.env.ADMIN_USER || "admin";
  const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";
  const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(ADMIN_USER);
  if (!exists) {
    db.prepare("INSERT INTO users (username, pass, role) VALUES (?, ?, ?)").run(ADMIN_USER, hashPassword(ADMIN_PASS), "admin");
    console.log(`👤 User default dibuat: ${ADMIN_USER} (ganti password via tabel users / ENV)`);
  }
}
function getSessionUser(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!m) return null;
  return (
    db
      .prepare("SELECT s.username, u.role FROM sessions s JOIN users u ON u.username = s.username WHERE s.token = ?")
      .get(m[1]) || null
  );
}
function requireAuth(req, res, next) {
  const u = getSessionUser(req);
  if (!u) return res.status(401).json({ error: "Belum login — silakan login dulu" });
  req.user = u;
  next();
}

const DEFAULT_KRITERIA = [
  { id: "k1", nama: "Harga Penawaran", jenis: "cost", keterangan: "Total biaya pembangunan / repair kapal" },
  { id: "k2", nama: "Kualitas Material & Welding", jenis: "benefit", keterangan: "Grade plat, pengelasan, QC & klasifikasi" },
  { id: "k3", nama: "Waktu Penyelesaian", jenis: "cost", keterangan: "Durasi docking / building sampai delivery" },
  { id: "k4", nama: "Kapasitas & Fasilitas Galangan", jenis: "benefit", keterangan: "Dockyard, crane, slipway, tenaga ahli" },
  { id: "k5", nama: "Reputasi & Pengalaman", jenis: "benefit", keterangan: "Portofolio kapal & sertifikasi" },
];
const DEFAULT_ALTERNATIF = [
  { id: "a1", nama: "Meridian Dockyard", keterangan: "Galangan besar — kapasitas 50.000 DWT" },
  { id: "a2", nama: "Harborline Marine", keterangan: "Galangan menengah — spesialis repair & retrofit" },
  { id: "a3", nama: "Seaborn Heavy Industries", keterangan: "Galangan baru — harga kompetitif" },
  { id: "a4", nama: "Northbay Shipworks", keterangan: "Berpengalaman kapal niaga & kargo" },
];
// Migrasi sekali jalan: rename contoh lama ke nama baru (data custom pengguna tidak tersentuh)
const LEGACY_ALTERNATIF_NAMES = {
  "Galangan A — Nusantara Steel": { nama: "Meridian Dockyard", keterangan: "Galangan besar — kapasitas 50.000 DWT" },
  "Galangan B — Samudra Biru": { nama: "Harborline Marine", keterangan: "Galangan menengah — spesialis repair & retrofit" },
  "Galangan C — Cakra Bahari": { nama: "Seaborn Heavy Industries", keterangan: "Galangan baru — harga kompetitif" },
  "Galangan D — Lintas Samudra": { nama: "Northbay Shipworks", keterangan: "Berpengalaman kapal niaga & kargo" },
};
function migrateLegacyNames() {
  const upd = db.prepare("UPDATE alternatif SET nama = ?, keterangan = ? WHERE id = ?");
  for (const [oldName, neu] of Object.entries(LEGACY_ALTERNATIF_NAMES)) {
    const row = db.prepare("SELECT id FROM alternatif WHERE nama = ?").get(oldName);
    if (row) upd.run(neu.nama, neu.keterangan, row.id);
  }
}
const SAMPLE_KRITERIA_MATRIX = [
  [1, 1 / 2, 2, 3, 4],
  [2, 1, 3, 4, 5],
  [1 / 2, 1 / 3, 1, 2, 3],
  [1 / 3, 1 / 4, 1 / 2, 1, 2],
  [1 / 4, 1 / 5, 1 / 3, 1 / 2, 1],
];

function getMatrix(key, fallback) {
  const row = db.prepare("SELECT value FROM matriks WHERE key = ?").get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}
function setMatrix(key, matrix) {
  db.prepare("INSERT OR REPLACE INTO matriks (key, value) VALUES (?, ?)").run(key, JSON.stringify(matrix));
}
function allKriteria() {
  return db.prepare("SELECT * FROM kriteria ORDER BY rowid").all();
}
function allAlternatif() {
  return db.prepare("SELECT * FROM alternatif ORDER BY rowid").all();
}
function seedIfEmpty(force = false) {
  const nk = db.prepare("SELECT COUNT(*) c FROM kriteria").get().c;
  const na = db.prepare("SELECT COUNT(*) c FROM alternatif").get().c;
  if (!force && nk > 0 && na > 0) return false;
  if (force) {
    db.exec("DELETE FROM kriteria; DELETE FROM alternatif; DELETE FROM matriks;");
  }
  const ik = db.prepare("INSERT OR REPLACE INTO kriteria (id, nama, jenis, keterangan) VALUES (?, ?, ?, ?)");
  const ia = db.prepare("INSERT OR REPLACE INTO alternatif (id, nama, keterangan) VALUES (?, ?, ?)");
  for (const k of DEFAULT_KRITERIA) ik.run(k.id, k.nama, k.jenis, k.keterangan);
  for (const a of DEFAULT_ALTERNATIF) ia.run(a.id, a.nama, a.keterangan);
  setMatrix("kriteria", SAMPLE_KRITERIA_MATRIX);
  for (const k of DEFAULT_KRITERIA) setMatrix(`alt:${k.id}`, makeIdentity(DEFAULT_ALTERNATIF.length));
  return true;
}
seedIfEmpty(process.argv.includes("--seed"));
ensureAdminUser();
migrateLegacyNames();

// ---------- App ----------
const app = express();
app.use(cors({ origin: [FRONTEND_URL, "http://localhost:3000"], credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ahp-shipyard-backend", time: new Date().toISOString() });
});

// --- Auth (publik) ---
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = username && db.prepare("SELECT * FROM users WHERE username = ?").get(String(username));
  if (!u || !verifyPassword(String(password || ""), u.pass)) {
    return res.status(401).json({ error: "Username / password salah" });
  }
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, username) VALUES (?, ?)").run(token, u.username);
  res.json({ data: { token, username: u.username, role: u.role } });
});

// --- Semua /api lain wajib login ---
app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/auth/login") return next();
  return requireAuth(req, res, next);
});

app.post("/api/auth/logout", (req, res) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (m) db.prepare("DELETE FROM sessions WHERE token = ?").run(m[1]);
  res.json({ ok: true });
});
app.get("/api/auth/me", (req, res) => {
  res.json({ data: req.user });
});

// --- Kriteria ---
app.get("/api/kriteria", (_req, res) => res.json({ data: allKriteria() }));
app.post("/api/kriteria", (req, res) => {
  const { nama, jenis = "benefit", keterangan = "" } = req.body || {};
  if (!nama || !String(nama).trim()) return res.status(400).json({ error: "nama wajib diisi" });
  if (allKriteria().length >= 10) return res.status(400).json({ error: "Maksimal 10 kriteria" });
  const id = uid("k");
  db.prepare("INSERT INTO kriteria (id, nama, jenis, keterangan) VALUES (?, ?, ?, ?)")
    .run(id, String(nama).trim(), jenis === "cost" ? "cost" : "benefit", String(keterangan || ""));
  // resize matriks kriteria + buat matriks alternatif baru
  const kriteria = allKriteria();
  const alt = allAlternatif();
  setMatrix("kriteria", resizeMatrix(getMatrix("kriteria", []), kriteria.length));
  setMatrix(`alt:${id}`, makeIdentity(alt.length));
  res.status(201).json({ data: { id, nama, jenis, keterangan } });
});
app.delete("/api/kriteria/:id", (req, res) => {
  const { id } = req.params;
  const kriteria = allKriteria();
  const idx = kriteria.findIndex((k) => k.id === id);
  if (idx < 0) return res.status(404).json({ error: "kriteria tidak ditemukan" });
  db.prepare("DELETE FROM kriteria WHERE id = ?").run(id);
  db.prepare("DELETE FROM matriks WHERE key = ?").run(`alt:${id}`);
  const sisa = allKriteria();
  const old = getMatrix("kriteria", []);
  const filtered = old.filter((_, i) => i !== idx).map((row) => row.filter((_, j) => j !== idx));
  setMatrix("kriteria", resizeMatrix(filtered, sisa.length));
  res.json({ ok: true });
});

// --- Alternatif ---
app.get("/api/alternatif", (_req, res) => res.json({ data: allAlternatif() }));
app.post("/api/alternatif", (req, res) => {
  const { nama, keterangan = "" } = req.body || {};
  if (!nama || !String(nama).trim()) return res.status(400).json({ error: "nama wajib diisi" });
  if (allAlternatif().length >= 10) return res.status(400).json({ error: "Maksimal 10 alternatif" });
  const id = uid("a");
  db.prepare("INSERT INTO alternatif (id, nama, keterangan) VALUES (?, ?, ?)")
    .run(id, String(nama).trim(), String(keterangan || ""));
  const kriteria = allKriteria();
  const alt = allAlternatif();
  for (const k of kriteria) setMatrix(`alt:${k.id}`, resizeMatrix(getMatrix(`alt:${k.id}`, []), alt.length));
  res.status(201).json({ data: { id, nama, keterangan } });
});
app.delete("/api/alternatif/:id", (req, res) => {
  const { id } = req.params;
  const alt = allAlternatif();
  const idx = alt.findIndex((a) => a.id === id);
  if (idx < 0) return res.status(404).json({ error: "alternatif tidak ditemukan" });
  db.prepare("DELETE FROM alternatif WHERE id = ?").run(id);
  for (const k of allKriteria()) {
    const m = getMatrix(`alt:${k.id}`, []);
    const filtered = m.filter((_, i) => i !== idx).map((row) => row.filter((_, j) => j !== idx));
    setMatrix(`alt:${k.id}`, resizeMatrix(filtered, alt.length - 1));
  }
  res.json({ ok: true });
});

// --- Penilaian ---
app.get("/api/penilaian/kriteria", (_req, res) => {
  const kriteria = allKriteria();
  res.json({ data: resizeMatrix(getMatrix("kriteria", []), kriteria.length) });
});
app.put("/api/penilaian/kriteria", (req, res) => {
  const { matrix } = req.body || {};
  const kriteria = allKriteria();
  if (!Array.isArray(matrix) || matrix.length !== kriteria.length)
    return res.status(400).json({ error: `matrix harus ${kriteria.length}x${kriteria.length}` });
  // paksa resiprokal
  const m = matrix.map((r) => [...r]);
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m.length; j++) {
    if (i === j) m[i][j] = 1;
    else if (i < j) m[j][i] = 1 / (Number(m[i][j]) || 1);
  }
  setMatrix("kriteria", m);
  res.json({ data: m, ahp: calcAHP(m) });
});
app.get("/api/penilaian/alternatif/:kriteriaId", (req, res) => {
  const alt = allAlternatif();
  const m = resizeMatrix(getMatrix(`alt:${req.params.kriteriaId}`, []), alt.length);
  res.json({ data: m });
});
app.put("/api/penilaian/alternatif/:kriteriaId", (req, res) => {
  const { matrix } = req.body || {};
  const alt = allAlternatif();
  if (!Array.isArray(matrix) || matrix.length !== alt.length)
    return res.status(400).json({ error: `matrix harus ${alt.length}x${alt.length}` });
  const m = matrix.map((r) => [...r]);
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m.length; j++) {
    if (i === j) m[i][j] = 1;
    else if (i < j) m[j][i] = 1 / (Number(m[i][j]) || 1);
  }
  setMatrix(`alt:${req.params.kriteriaId}`, m);
  res.json({ data: m, ahp: calcAHP(m) });
});

// --- Hasil / sintesis global ---
function computeHasil() {
  const kriteria = allKriteria();
  const alt = allAlternatif();
  const pk = resizeMatrix(getMatrix("kriteria", []), kriteria.length);
  const wKriteria = calcAHP(pk);
  const perKriteria = kriteria.map((k) => {
    const m = resizeMatrix(getMatrix(`alt:${k.id}`, []), alt.length);
    return { kriteria: k, matrix: m, ahp: calcAHP(m) };
  });
  const skor = alt.map((_, i) => {
    let s = 0;
    perKriteria.forEach((lk, kk) => { s += (wKriteria.priority[kk] || 0) * (lk.ahp.priority[i] || 0); });
    return s;
  });
  const ranking = alt
    .map((a, i) => ({ ...a, skor: skor[i] || 0 }))
    .sort((x, y) => y.skor - x.skor)
    .map((r, idx) => ({ ...r, peringkat: idx + 1 }));
  return {
    kriteria, alternatif: alt,
    bobotKriteria: wKriteria,
    perKriteria: perKriteria.map((p) => ({ kriteriaId: p.kriteria.id, nama: p.kriteria.nama, priority: p.ahp.priority, ...p.ahp })),
    skor: alt.map((a, i) => ({ alternatifId: a.id, nama: a.nama, skor: skor[i] || 0 })),
    ranking,
    konsistenSemua: wKriteria.consistent && perKriteria.every((p) => p.ahp.consistent),
  };
}
app.get("/api/hasil", (_req, res) => {
  if (allKriteria().length < 2 || allAlternatif().length < 2)
    return res.status(400).json({ error: "Butuh minimal 2 kriteria & 2 alternatif" });
  res.json({ data: computeHasil() });
});

// --- Util ---
app.get("/api/export", (_req, res) => {
  const kriteria = allKriteria();
  const alt = allAlternatif();
  const matriks = {};
  matriks.kriteria = getMatrix("kriteria", []);
  for (const k of kriteria) matriks[`alt:${k.id}`] = getMatrix(`alt:${k.id}`, []);
  res.json({ data: { kriteria, alternatif: alt, matriks, hasil: computeHasil() } });
});
app.post("/api/reset", (_req, res) => {
  seedIfEmpty(true);
  res.json({ ok: true, message: "Database di-reset ke contoh awal" });
});
// Full-state import (dipakai frontend untuk sinkron satu klik)
app.post("/api/import", (req, res) => {
  const { kriteria, alternatif, pairwiseKriteria, pairwiseAlternatif } = req.body || {};
  if (!Array.isArray(kriteria) || !Array.isArray(alternatif))
    return res.status(400).json({ error: "kriteria & alternatif harus array" });
  if (kriteria.length > 10 || alternatif.length > 10)
    return res.status(400).json({ error: "Maksimal 10 kriteria & 10 alternatif" });
  try {
    db.exec("DELETE FROM kriteria; DELETE FROM alternatif; DELETE FROM matriks;");
    const ik = db.prepare("INSERT INTO kriteria (id, nama, jenis, keterangan) VALUES (?, ?, ?, ?)");
    const ia = db.prepare("INSERT INTO alternatif (id, nama, keterangan) VALUES (?, ?, ?)");
    for (const k of kriteria) {
      if (!k.id || !k.nama) continue;
      ik.run(String(k.id), String(k.nama), k.jenis === "cost" ? "cost" : "benefit", String(k.keterangan || ""));
    }
    for (const a of alternatif) {
      if (!a.id || !a.nama) continue;
      ia.run(String(a.id), String(a.nama), String(a.keterangan || ""));
    }
    const nk = allKriteria().length;
    const na = allAlternatif().length;
    if (Array.isArray(pairwiseKriteria)) setMatrix("kriteria", resizeMatrix(pairwiseKriteria, nk));
    if (pairwiseAlternatif && typeof pairwiseAlternatif === "object") {
      for (const k of allKriteria()) {
        const m = pairwiseAlternatif[k.id];
        setMatrix(`alt:${k.id}`, resizeMatrix(Array.isArray(m) ? m : [], na));
      }
    }
    res.json({ ok: true, data: computeHasil() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal import data" });
  }
});

app.use(( _req, res) => res.status(404).json({ error: "Endpoint tidak ditemukan" }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`✅ SPK-AHP backend jalan di http://localhost:${PORT}`);
  console.log(`   DB: ${DB_PATH}`);
});
