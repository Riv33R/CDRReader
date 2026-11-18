import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, ListFilter, Moon, PhoneCall, Sun, UploadCloud } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Дашборд", icon: BarChart3 },
  { to: "/calls", label: "Журнал звонков", icon: ListFilter },
  { to: "/imports", label: "Импорт CDR/CMR", icon: UploadCloud },
];

export function Layout({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("cdr_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("cdr_theme", "light");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-dark-900 dark:text-slate-100 flex flex-col transition-colors">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-dark-800/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 truncate">
                Cisco CDR Reader
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  CUCM Analytics
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Анализ вызовов и качества речи Cisco Unified Communications Manager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1.5">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      isActive
                        ? "bg-brand-600 text-white border-brand-600 dark:bg-brand-500/20 dark:border-brand-500 shadow-sm shadow-brand-500/20"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              title={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
              aria-label="Переключить тему"
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-brand-600" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
