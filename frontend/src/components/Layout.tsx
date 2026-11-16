import { BarChart3, ListFilter, PhoneCall, UploadCloud } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const navItems = [
  { to: "/", label: "Сводка и аналитика", icon: BarChart3 },
  { to: "/calls", label: "Журнал вызовов", icon: ListFilter },
  { to: "/imports", label: "Загрузка и импорт", icon: UploadCloud },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#f4f6f9] text-slate-900">
      <aside className="w-60 bg-slate-950 text-slate-200 flex flex-col shrink-0 border-r border-slate-800">
        <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-md bg-sky-700 flex items-center justify-center shrink-0">
            <PhoneCall className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-xs uppercase tracking-wider text-white truncate">
              Cisco CDR Reader
            </div>
            <div className="text-[11px] text-slate-400 truncate">CUCM Voice Analytics</div>
          </div>
        </div>

        <div className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Навигация
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors border-l-2 ${
                  isActive
                    ? "bg-slate-900 text-white border-sky-500"
                    : "text-slate-400 border-transparent hover:bg-slate-900/60 hover:text-slate-200"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center justify-between">
            <span>Формат</span>
            <span className="font-mono text-slate-400">CUCM CDR/CMR</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Архивы</span>
            <span className="font-mono text-slate-400">CSV / GZ / ZIP</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Unified Communications • Call Detail Records
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Система активна</span>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
