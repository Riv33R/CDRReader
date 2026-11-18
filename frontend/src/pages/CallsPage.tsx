import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Download, Search, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import { CallDetailDrawer } from "../components/CallDetailDrawer";
import type { CallDirection, CallFilters, CallsPage as CallsPageData, CdrDetail } from "../types/cdr";
import { formatDateTime, formatDuration, getDirectionMeta } from "../utils/format";

const INITIAL_FILTERS: CallFilters = {
  page: 1,
  page_size: 50,
  sort_by: "date_time_origination",
  sort_dir: "desc",
  calling: "",
  called: "",
  device: "",
  answered: "",
  direction: "",
  cause_code: "",
  date_from: "",
  date_to: "",
  min_duration: "",
};

const DIRECTION_TABS: { value: "" | CallDirection; label: string }[] = [
  { value: "", label: "Все звонки" },
  { value: "inbound", label: "↙ Входящие" },
  { value: "outbound", label: "↗ Исходящие" },
  { value: "internal", label: "⇄ Внутренние" },
];

export function CallsPage() {
  const [filters, setFilters] = useState<CallFilters>(INITIAL_FILTERS);
  const [draft, setDraft] = useState<CallFilters>(INITIAL_FILTERS);
  const [data, setData] = useState<CallsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<CdrDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCalls = useCallback((f: CallFilters) => {
    setLoading(true);
    setError(null);
    const query: CallFilters = {
      ...f,
      date_from: f.date_from ? new Date(`${f.date_from}T00:00:00`).toISOString() : undefined,
      date_to: f.date_to ? new Date(`${f.date_to}T23:59:59.999`).toISOString() : undefined,
    };
    api
      .getCalls(query)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCalls(filters);
  }, [filters, loadCalls]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...draft, page: 1 });
  };

  const resetFilters = () => {
    setDraft(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
  };

  const selectDirection = (dir: "" | CallDirection) => {
    const next = { ...draft, direction: dir, page: 1 };
    setDraft(next);
    setFilters(next);
  };

  const swapNumbers = () => {
    const next = {
      ...draft,
      calling: draft.called ?? "",
      called: draft.calling ?? "",
      page: 1,
    };
    setDraft(next);
    setFilters(next);
  };

  const openDetail = (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    api
      .getCallDetail(id)
      .then(setDetail)
      .catch((err) => {
        setDetail(null);
        setError(err instanceof Error ? err.message : "Не удалось загрузить детали вызова");
      })
      .finally(() => setDetailLoading(false));
  };

  const exportFilters: CallFilters = {
    ...filters,
    date_from: filters.date_from ? new Date(`${filters.date_from}T00:00:00`).toISOString() : undefined,
    date_to: filters.date_to ? new Date(`${filters.date_to}T23:59:59.999`).toISOString() : undefined,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Журнал вызовов</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Поиск, фильтрация и экспорт записей Cisco CUCM CDR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getExportUrl("csv", exportFilters)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5" /> Экспорт CSV
          </a>
          <a
            href={api.getExportUrl("xlsx", exportFilters)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-md shadow-brand-600/30 transition"
          >
            <Download className="w-3.5 h-3.5" /> Экспорт XLSX
          </a>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="bg-white dark:bg-dark-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm dark:shadow-xl space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {DIRECTION_TABS.map((tab) => {
              const active = (filters.direction ?? "") === tab.value;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  onClick={() => selectDirection(tab.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    active
                      ? "bg-brand-600 text-white border-brand-600 dark:bg-brand-500/20 dark:border-brand-500 shadow-sm shadow-brand-500/20"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-dark-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Раздельный поиск по вызывающему и вызываемому номеру
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          <div className="sm:col-span-2 lg:col-span-5 flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Вызывающий (От кого)"
              value={draft.calling ?? ""}
              onChange={(e) => setDraft({ ...draft, calling: e.target.value })}
              className="flex-1 min-w-0 text-xs bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={swapNumbers}
              title="Поменять вызывающий и вызываемый местами"
              aria-label="Поменять вызывающий и вызываемый местами"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-900 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:border-brand-500 transition shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              placeholder="Вызываемый (Кому)"
              value={draft.called ?? ""}
              onChange={(e) => setDraft({ ...draft, called: e.target.value })}
              className="flex-1 min-w-0 text-xs bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <input
            type="text"
            placeholder="Устройство / транк"
            value={draft.device ?? ""}
            onChange={(e) => setDraft({ ...draft, device: e.target.value })}
            className="lg:col-span-2 text-xs bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <select
            value={draft.answered ?? ""}
            onChange={(e) => setDraft({ ...draft, answered: e.target.value as "" | "true" | "false" })}
            className="lg:col-span-2 text-xs bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">Все статусы</option>
            <option value="true">Только отвеченные</option>
            <option value="false">Только пропущенные</option>
          </select>
          <input
            type="date"
            value={draft.date_from ?? ""}
            onChange={(e) => setDraft({ ...draft, date_from: e.target.value })}
            aria-label="Дата с"
            className="lg:col-span-3 sm:col-span-1 text-xs font-mono bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={draft.date_to ?? ""}
              onChange={(e) => setDraft({ ...draft, date_to: e.target.value })}
              aria-label="Дата по"
              className="text-xs font-mono bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
            />
            <input
              type="number"
              min={0}
              placeholder="Cause code (16)"
              value={draft.cause_code ?? ""}
              onChange={(e) => setDraft({ ...draft, cause_code: e.target.value })}
              className="text-xs bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 w-36 focus:outline-none focus:border-brand-500"
            />
            <input
              type="number"
              min={0}
              placeholder="Мин. длит. (сек)"
              value={draft.min_duration ?? ""}
              onChange={(e) => setDraft({ ...draft, min_duration: e.target.value })}
              className="text-xs bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 w-36 focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Сбросить
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition"
            >
              <Search className="w-3.5 h-3.5" /> Применить
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-dark-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-dark-900/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Дата и время</th>
                <th className="px-4 py-3">Направление</th>
                <th className="px-4 py-3">Вызывающий</th>
                <th className="px-4 py-3">Вызываемый</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Длит.</th>
                <th className="px-4 py-3">Маршрут устройств</th>
                <th className="px-4 py-3">Причина отбоя</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    Загрузка реестра звонков...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    Записи не найдены
                  </td>
                </tr>
              ) : (
                data.items.map((call) => {
                  const cause =
                    call.dest_cause_info && call.dest_cause_info.code !== 0
                      ? call.dest_cause_info
                      : (call.orig_cause_info ?? call.dest_cause_info);
                  const dirMeta = getDirectionMeta(call.direction);
                  return (
                    <tr
                      key={call.id}
                      onClick={() => openDetail(call.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                        {formatDateTime(call.date_time_origination)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-semibold ${dirMeta.badgeClass}`}
                        >
                          {dirMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                        {call.calling_party_number || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                        {call.final_called_party_number || call.original_called_party_number || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                            call.answered
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {call.answered ? "Отвечен" : "Пропущен"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-[230px] truncate">
                        {call.orig_device_name || "?"} → {call.dest_device_name || "?"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {cause ? `${cause.code} (${cause.name})` : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-dark-900/60 font-mono tabular-nums">
            <div>
              Всего записей: <b className="text-slate-900 dark:text-white">{data.total.toLocaleString("ru-RU")}</b> • Стр. {data.page} из {data.pages}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={data.page <= 1}
                onClick={() => setFilters({ ...filters, page: data.page - 1 })}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={data.page >= data.pages}
                onClick={() => setFilters({ ...filters, page: data.page + 1 })}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CallDetailDrawer
        detail={detail}
        loading={detailLoading}
        onClose={() => {
          setDetail(null);
          setDetailLoading(false);
        }}
      />
    </div>
  );
}
