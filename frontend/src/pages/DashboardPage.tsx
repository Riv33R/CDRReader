import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, PhoneIncoming, PhoneMissed, PhoneOutgoing } from "lucide-react";
import { api } from "../api/client";
import type { AppConfig, DashboardStats, TopItemPoint } from "../types/cdr";
import { formatDuration } from "../utils/format";

const PIE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#f43f5e", "#06b6d4", "#8b5cf6", "#64748b"];

function TopTable({ title, items }: { title: string; items: TopItemPoint[] }) {
  return (
    <div className="bg-white dark:bg-dark-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-xl">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">Нет данных</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs py-2">
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={item.label}>
                {item.label}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                <b className="text-slate-900 dark:text-white">{item.count}</b> • {formatDuration(item.total_duration)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [granularity, setGranularity] = useState<"day" | "hour">("day");
  const [direction, setDirection] = useState<"" | "inbound" | "outbound" | "internal">("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getDashboardStats({
        date_from: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
        date_to: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
        granularity,
        direction: direction || undefined,
      })
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Ошибка загрузки");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, granularity, direction]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Сводка и аналитика вызовов
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Показатели нагрузки и качества маршрутизации Cisco CUCM
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-dark-800/90 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs font-mono bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
            aria-label="Дата с"
          />
          <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs font-mono bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
            aria-label="Дата по"
          />
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "" | "inbound" | "outbound" | "internal")}
            aria-label="Направление"
            className="text-xs bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">Все направления</option>
            <option value="inbound">↙ Входящие</option>
            <option value="outbound">↗ Исходящие</option>
            <option value="internal">⇄ Внутренние</option>
          </select>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as "day" | "hour")}
            className="text-xs bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="day">По дням</option>
            <option value="hour">По часам</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {config && !config.cdr_analytics_enabled && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span>⚠️ Аналитика вызовов (CDR) отключена в настройках сервера (ENABLE_CDR_ANALYTICS=false). Разбор входящих файлов CDR приостановлен.</span>
        </div>
      )}

      {loading && !stats ? (
        <div className="text-center py-16 text-sm text-slate-500 dark:text-slate-400">Загрузка статистики...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-dark-800/90 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 p-6 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <span>Всего вызовов</span>
                <PhoneOutgoing className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="font-mono text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tight tabular-nums">
                {stats.total_calls.toLocaleString("ru-RU")}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono">
                Суммарно: {formatDuration(stats.total_duration)}
              </div>
            </div>

            <div className="bg-white dark:bg-dark-800/90 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 p-6 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <span>Отвечено</span>
                <PhoneIncoming className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="font-mono text-4xl font-black text-emerald-700 dark:text-white mt-2 tracking-tight tabular-nums">
                {stats.answered_calls.toLocaleString("ru-RU")}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-300/90 mt-2 font-mono">
                ASR: {stats.answer_rate}%
              </div>
            </div>

            <div className="bg-white dark:bg-dark-800/90 rounded-2xl border border-rose-200 dark:border-rose-500/30 p-6 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider">
                <span>Пропущено / Ошибки</span>
                <PhoneMissed className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="font-mono text-4xl font-black text-rose-600 dark:text-white mt-2 tracking-tight tabular-nums">
                {stats.missed_calls.toLocaleString("ru-RU")}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Без ответа или сбой</div>
            </div>

            <div className="bg-white dark:bg-dark-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Средняя длит. (ACD)</span>
                <Clock className="w-4 h-4 text-brand-500 dark:text-brand-400" />
              </div>
              <div className="font-mono text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tight tabular-nums">
                {formatDuration(Math.round(stats.avg_duration))}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">По отвеченным вызовам</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-dark-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                Динамика вызовов
              </h3>
              {stats.time_series.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                  Загрузите CDR-файлы для отображения графика
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.time_series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.2} />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#475569" />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#475569" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0B0F19",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          color: "#f1f5f9",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="answered" name="Отвечено" stackId="a" fill="#10b981" />
                      <Bar dataKey="missed" name="Пропущено" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-dark-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                Причины завершения (Cause Codes)
              </h3>
              {stats.cause_distribution.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                  Нет данных
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.cause_distribution}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={78}
                        label={({ name }) => name}
                      >
                        {stats.cause_distribution.map((entry, idx) => (
                          <Cell key={entry.code} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0B0F19",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          color: "#f1f5f9",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, _name: string, item: { payload?: { description?: string } }) => [
                          `${value} (${item.payload?.description ?? ""})`,
                          "Звонков",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TopTable title="Топ вызывающих номеров" items={stats.top_callers} />
            <TopTable title="Топ вызываемых номеров" items={stats.top_called} />
            <TopTable title="Топ устройств / транков" items={stats.top_devices} />
          </div>
        </>
      ) : null}
    </div>
  );
}
