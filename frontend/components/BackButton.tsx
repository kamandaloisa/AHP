"use client";

import Link from "next/link";

export default function BackButton({
  href = "/",
  label = "Kembali",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-full bg-slate-900 py-1.5 pl-1.5 pr-4 text-sm font-bold text-white shadow-lg shadow-slate-900/25 transition duration-200 hover:-translate-x-1 hover:bg-sky-700 hover:shadow-xl hover:shadow-sky-600/30 active:translate-x-0"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200 group-hover:-translate-x-0.5"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      </span>
      {label}
    </Link>
  );
}
