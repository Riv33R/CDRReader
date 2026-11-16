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
import type { DashboardStats, TopItemPoint } from "../types/cdr";
import { formatDuration } from "../utils/format";

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#ec4899"];

function TopTable({ title, items }: { title: string; items: TopItemPoint[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{title}</h3>
      {items.length === 0 ? (
        <div className="text-sm text-slate-400 py-6 text-center">Нет данных</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
              <span className="font-medium text-slate-700 truncate max-w-[160px]" title={item.label}>
                {item.label}
              </span>
              <span className="text-slate-500 text-xs">
                <b className="text-slate-800 text-sm">{item.count}</b> ({formatDuration(item.total_duration)})
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getDashboardStats({
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
        granularity,
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
  }, [dateFrom, dateTo, granularity]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Дашборд звонков</h1>
          <p className="text-sm text-slate-500">Аналитика и статистика по записям Cisco CUCM CDR</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5"
            aria-label="Дата с"
          />
          <span className="text-slate-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5"
            aria-label="Дата по"
          />
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as "day" | "hour")}
            className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
          >
            <option value="day">По дням</option>
            <option value="hour">По часам</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="text-center py-16 text-slate-500">Загрузка статистики...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-sm">
                <span>Всего звонков</span>
                <PhoneOutgoing className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {stats.total_calls.toLocaleString("ru-RU")}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Общая длительность: {formatDuration(stats.total_duration)}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-sm">
                <span>Отвечено</span>
                <PhoneIncoming className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                {stats.answered_calls.toLocaleString("ru-RU")}
              </div>
              <div className="text-xs text-slate-500 mt-1">Успешность: {stats.answer_rate}%</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-sm">
                <span>Пропущено / Ошибки</span>
                <PhoneMissed className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                {stats.missed_calls.toLocaleString("ru-RU")}
              </div>
              <div className="text-xs text-slate-400 mt-1">Без ответа или сбой</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-sm">
                <span>Средняя длительность</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {formatDuration(Math.round(stats.avg_duration))}
              </div>
              <div className="text-xs text-slate-400 mt-1">По отвеченным вызовам</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Динамика вызовов</h3>
              {stats.time_series.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                  Загрузите CDR-файлы для отображения графика
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.time_series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="answered" name="Отвечено" stackId="a" fill="#10b981" />
                      <Bar dataKey="missed" name="Пропущено" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Причины завершения (Cause Codes)</h3>
              {stats.cause_distribution.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Нет данных</div>
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
                        outerRadius={80}
                        label={({ name }) => name}
                      >
                        {stats.cause_distribution.map((entry, idx) => (
                          <Cell key={entry.code} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TopTable title="Топ вызывающих номеров" items={stats.top_callers} />
            <TopTable title="Топ вызываемых номеров" items={stats.top_called} />
            <TopTable title="Топ устройств / транков" items={stats.top_devices} />
          </div>
        </>
      ) : null}
    </div>
  );
}
