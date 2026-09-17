"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "บันทึกทริป",
      href: "/",
      icon: "🚗",
    },
    {
      name: "รายงาน",
      href: "/report",
      icon: "📊",
    },
    {
      name: "แอดมิน",
      href: "/admin",
      icon: "⚙️",
    },
  ];

  return (
    <nav className="print:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 pt-3 pb-6 flex justify-around items-center z-50 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
      <div className="max-w-md w-full mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1.5 px-4.5 rounded-2xl transition-all active:scale-90 ${
                isActive
                  ? "text-indigo-600 bg-indigo-50/90 font-black shadow-xs"
                  : "text-slate-400 hover:text-slate-600 font-bold"
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[11px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
