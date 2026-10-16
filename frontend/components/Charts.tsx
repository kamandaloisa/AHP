"use client";

export const PALETTE = [
  "#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

/* ---------- Donut bobot kriteria ---------- */
export function DonutChart({
  data,
  size = 190,
  thickness = 30,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const cx = size / 2;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#eef2f7" strokeWidth={thickness} />
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * c;
            const gap = c - dash;
            const offset = -acc * c;
            acc += frac;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-extrabold text-slate-900">{data.length}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">kriteria</p>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{d.label}</span>
            <span className="font-mono font-bold text-slate-900">{((d.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Bar horizontal ranking ---------- */
export function RankingBars({
  data,
  maxRows = 6,
}: {
  data: { label: string; sub?: string; value: number; color: string; badge?: string }[];
  maxRows?: number;
}) {
  const rows = data.slice(0, maxRows);
  const max = Math.max(...rows.map((r) => r.value), 0.0001);
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <p className="min-w-0 truncate font-semibold text-slate-700">
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
                {i + 1}
              </span>
              {r.label}
              {r.badge && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {r.badge}
                </span>
              )}
            </p>
            <p className="shrink-0 font-mono font-bold text-slate-900">{r.value.toFixed(4)}</p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(r.value / max) * 100}%`, background: `linear-gradient(90deg, ${r.color}, ${r.color}cc)` }}
            />
          </div>
          {r.sub && <p className="mt-0.5 truncate text-[11px] text-slate-400">{r.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Gauge konsistensi CR ---------- */
export function ConsistencyGauge({ cr }: { cr: number }) {
  const ok = cr <= 0.1;
  // skala 0..0.3 dipetakan ke 0..180 derajat
  const t = Math.min(Math.max(cr / 0.3, 0), 1);
  const angle = 180 - t * 180;
  const cx = 100;
  const cy = 90;
  const r = 72;
  const rad = (angle * Math.PI) / 180;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);
  const arc = (from: number, to: number, color: string, w = 14) => {
    const a1 = ((180 - from * 180) * Math.PI) / 180;
    const a2 = ((180 - to * 180) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy - r * Math.sin(a2);
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-full max-w-[240px]">
        {arc(0, 0.333, "#10b981")}
        {arc(0.333, 0.666, "#f59e0b")}
        {arc(0.666, 1, "#ef4444")}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0f172a" strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={7} fill="#0f172a" />
        <circle cx={cx} cy={cy} r={2.5} fill="#fff" />
      </svg>
      <p className={`-mt-1 font-mono text-2xl font-extrabold ${ok ? "text-emerald-600" : "text-red-600"}`}>
        {cr.toFixed(4)}
      </p>
      <span
        className={`mt-1 rounded-full px-3 py-1 text-[11px] font-bold ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        }`}
      >
        {ok ? "KONSISTEN ✓ (CR ≤ 0.1)" : "TIDAK KONSISTEN"}
      </span>
    </div>
  );
}

/* ---------- Radar profil alternatif ---------- */
export function RadarChart({
  labels,
  series,
  size = 220,
}: {
  labels: string[];
  series: { label: string; values: number[]; color: string }[];
  size?: number;
}) {
  const n = labels.length;
  if (n < 3) return <p className="text-xs text-slate-400">Butuh ≥3 kriteria untuk radar.</p>;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34;
  const pt = (i: number, v: number) => {
    const ang = (2 * Math.PI * i) / n - Math.PI / 2;
    const rr = Math.max(0, Math.min(1, v)) * R;
    return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)] as const;
  };
  const ring = (f: number) =>
    Array.from({ length: n }, (_, i) => pt(i, f).join(",")).join(" ");
  // normalisasi tiap kriteria terhadap max series agar 0..1
  const maxPerAxis = labels.map((_, i) => Math.max(...series.map((s) => s.values[i] || 0), 0.0001));
  const norm = (s: { values: number[] }) => s.values.map((v, i) => (v || 0) / maxPerAxis[i]);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke="#e2e8f0" strokeWidth={1} />
        ))}
        {labels.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={1} />;
        })}
        {series.slice(0, 3).map((s, si) => {
          const vals = norm(s);
          const pts = vals.map((v, i) => pt(i, v).join(",")).join(" ");
          return (
            <polygon
              key={si}
              points={pts}
              fill={s.color}
              fillOpacity={0.14}
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          );
        })}
        {labels.map((l, i) => {
          const [x, y] = pt(i, 1.18);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" fontSize={9} fill="#64748b" fontWeight={600}>
              {l.length > 12 ? l.slice(0, 12) + "…" : l}
            </text>
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-2">
        {series.slice(0, 3).map((s, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="h-2 w-4 rounded-full" style={{ background: s.color }} />
            {s.label.length > 22 ? s.label.slice(0, 22) + "…" : s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Mini area chart (tren skor) ---------- */
export function MiniTrend({ values, color = "#0ea5e9" }: { values: number[]; color?: string }) {
  const w = 220;
  const h = 56;
  if (!values.length) return null;
  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * (w - 8) + 4;
    const y = h - 8 - ((v - min) / span) * (h - 20);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `4,${h - 4} ${pts.join(" ")} ${w - 4},${h - 4}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full">
      <polygon points={area} fill={color} opacity={0.14} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const [x, y] = p.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />;
      })}
    </svg>
  );
}
