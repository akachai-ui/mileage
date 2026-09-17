"use client";

import Link from 'next/link';

export default function AppHeader({ title = "Mileage", subtitle = "Corporate Edition", rightAction = null }) {
  return (
    <header className="print:hidden sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex justify-between items-center z-40 transition-all">
      <Link href="/" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 p-1 flex-shrink-0 flex items-center justify-center">
          <img src="/mileage.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{title}</h1>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{subtitle}</p>
        </div>
      </Link>
      {rightAction && (
        <div>{rightAction}</div>
      )}
    </header>
  );
}
