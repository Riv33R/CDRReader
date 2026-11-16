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

const PIE_COLORS = ["#0f766e", "#0369a1", "#b45309", "#be123c", "#475569", "#334155", "#64748b"];

function TopTable({ title, items }: { title: string; items: TopItemPoint[] }) {
  return (
    <div className="bg-white rounded-md border border-slate-200 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3 pb-2 border-b border-slate-100">
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400 py-6 text-center">Нет данных</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs py-1.5">
              <span className="font-mono font-medium text-slate-800 truncate max-w-[170px]" title={item.label}>
                {item.label}
              </span>
              <span className="text-slate-500 tabular-nums">
                <b className="text-slate-900">{item.count}</b> • {formatDuration(item.total_duration)}
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Сводка и аналитика вызовов</h1>
          <p className="text-xs text-slate-500">Показатели нагрузки и качества маршрутизации Cisco CUCM</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white px-2.5 py-1.5 rounded-md border border-slate-200">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-700"
            aria-label="Дата с"
          />
          <span className="text-slate-400 text-xs">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-700"
            aria-label="Дата по"
          />
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as "day" | "hour")}
            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
          >
            <option value="day">По дням</option>
            <option value="hour">По часам</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="text-center py-16 text-xs text-slate-500">Загрузка статистики...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-md border border-slate-200 border-t-2 border-t-sky-700 p-4">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <span>Всего вызовов</span>
                <PhoneOutgoing className="w-4 h-4 text-sky-700" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {stats.total_calls.toLocaleString("ru-RU")}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                Суммарно: {formatDuration(stats.total_duration)}
              </div>
            </div>

            <div className="bg-white rounded-md border border-slate-200 border-t-2 border-t-teal-700 p-4">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <span>Отвечено</span>
                <PhoneIncoming className="w-4 h-4 text-teal-700" />
              </div>
              <div className="text-2xl font-bold text-teal-700 mt-2 tabular-nums">
                {stats.answered_calls.toLocaleString("ru-RU")}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">ASR: {stats.answer_rate}%</div>
            </div>

            <div className="bg-white rounded-md border border-slate-200 border-t-2 border-t-rose-700 p-4">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <span>Пропущено / Ошибки</span>
                <PhoneMissed className="w-4 h-4 text-rose-700" />
              </div>
              <div className="text-2xl font-bold text-rose-700 mt-2 tabular-nums">
                {stats.missed_calls.toLocaleString("ru-RU")}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Без ответа или сбой</div>
            </div>

            <div className="bg-white rounded-md border border-slate-200 border-t-2 border-t-slate-700 p-4">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <span>Средняя длит. (ACD)</span>
                <Clock className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {formatDuration(Math.round(stats.avg_duration))}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">По отвеченным вызовам</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-md border border-slate-200 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-4 pb-2 border-b border-slate-100">
                Динамика вызовов
              </h3>
              {stats.time_series.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
                  Загрузите CDR-файлы для отображения графика
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.time_series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#475569" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="answered" name="Отвечено" stackId="a" fill="#0f766e" />
                      <Bar dataKey="missed" name="Пропущено" stackId="a" fill="#be123c" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-md border border-slate-200 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-4 pb-2 border-b border-slate-100">
                Причины завершения (Cause Codes)
              </h3>
              {stats.cause_distribution.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-400 text-xs">Нет данных</div>
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
