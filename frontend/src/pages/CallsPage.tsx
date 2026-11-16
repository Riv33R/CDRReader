import { useCallback, useEffect, useState } from "react";
import { Download, Search, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import { CallDetailDrawer } from "../components/CallDetailDrawer";
import type { CallFilters, CallsPage as CallsPageData, CdrDetail } from "../types/cdr";
import { formatDateTime, formatDuration } from "../utils/format";

const INITIAL_FILTERS: CallFilters = {
  page: 1,
  page_size: 50,
  sort_by: "date_time_origination",
  sort_dir: "desc",
  number: "",
  device: "",
  answered: "",
  cause_code: "",
  date_from: "",
  date_to: "",
  min_duration: "",
};

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
      date_from: f.date_from ? new Date(f.date_from).toISOString() : undefined,
      date_to: f.date_to ? new Date(`${f.date_to}T23:59:59`).toISOString() : undefined,
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

  const openDetail = (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    api
      .getCallDetail(id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  const exportFilters: CallFilters = {
    ...filters,
    date_from: filters.date_from ? new Date(filters.date_from).toISOString() : undefined,
    date_to: filters.date_to ? new Date(`${filters.date_to}T23:59:59`).toISOString() : undefined,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Журнал звонков</h1>
          <p className="text-sm text-slate-500">
            Поиск, фильтрация и выгрузка записей CUCM CDR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getExportUrl("csv", exportFilters)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> Экспорт CSV
          </a>
          <a
            href={api.getExportUrl("xlsx", exportFilters)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download className="w-4 h-4" /> Экспорт XLSX
          </a>
        </div>
      </div>

      <form onSubmit={applyFilters} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="Номер (исх./вх.)"
            value={draft.number ?? ""}
            onChange={(e) => setDraft({ ...draft, number: e.target.value })}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
          <input
            type="text"
            placeholder="Устройство / транк"
            value={draft.device ?? ""}
            onChange={(e) => setDraft({ ...draft, device: e.target.value })}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
          <select
            value={draft.answered ?? ""}
            onChange={(e) => setDraft({ ...draft, answered: e.target.value as "" | "true" | "false" })}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Все статусы</option>
            <option value="true">Только отвеченные</option>
            <option value="false">Только пропущенные</option>
          </select>
          <input
            type="number"
            min={0}
            placeholder="Cause code (напр. 16)"
            value={draft.cause_code ?? ""}
            onChange={(e) => setDraft({ ...draft, cause_code: e.target.value })}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
          <input
            type="date"
            value={draft.date_from ?? ""}
            onChange={(e) => setDraft({ ...draft, date_from: e.target.value })}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
          <input
            type="date"
            value={draft.date_to ?? ""}
            onChange={(e) => setDraft({ ...draft, date_to: e.target.value })}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="Мин. длит. (сек)"
              value={draft.min_duration ?? ""}
              onChange={(e) => setDraft({ ...draft, min_duration: e.target.value })}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="w-4 h-4" /> Сбросить
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
            >
              <Search className="w-4 h-4" /> Найти
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Дата и время</th>
                <th className="px-4 py-3">Вызывающий</th>
                <th className="px-4 py-3">Вызываемый</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Длит.</th>
                <th className="px-4 py-3">Устройства</th>
                <th className="px-4 py-3">Причина отбоя</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Загрузка звонков...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Записи не найдены
                  </td>
                </tr>
              ) : (
                data.items.map((call) => {
                  const cause = call.dest_cause_info ?? call.orig_cause_info;
                  return (
                    <tr
                      key={call.id}
                      onClick={() => openDetail(call.id)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {formatDateTime(call.date_time_origination)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {call.calling_party_number || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {call.final_called_party_number || call.original_called_party_number || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            call.answered
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {call.answered ? "Отвечен" : "Пропущен"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[220px] truncate">
                        {call.orig_device_name || "?"} → {call.dest_device_name || "?"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
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
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600 bg-slate-50">
            <div>
              Всего записей: <b>{data.total.toLocaleString("ru-RU")}</b> (стр. {data.page} из {data.pages})
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={data.page <= 1}
                onClick={() => setFilters({ ...filters, page: data.page - 1 })}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={data.page >= data.pages}
                onClick={() => setFilters({ ...filters, page: data.page + 1 })}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
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
