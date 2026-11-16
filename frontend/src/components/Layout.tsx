import { BarChart3, ListFilter, PhoneCall, UploadCloud } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const navItems = [
  { to: "/", label: "Дашборд", icon: BarChart3 },
  { to: "/calls", label: "Журнал звонков", icon: ListFilter },
  { to: "/imports", label: "Импорт CDR/CMR", icon: UploadCloud },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800">
          <div className="p-2 bg-blue-600 rounded-lg">
            <PhoneCall className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-wide">Cisco CDR Reader</div>
            <div className="text-xs text-slate-400">CUCM Analytics</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          Форматы: CUCM CDR / CMR (CSV, GZ, ZIP)
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
