import { useEffect } from "react";
import { X, Activity, Phone, Clock, Server } from "lucide-react";
import type { CdrDetail } from "../types/cdr";
import { formatDateTime, formatDuration, getDirectionMeta } from "../utils/format";

interface Props {
  detail: CdrDetail | null;
  loading: boolean;
  onClose: () => void;
}

export function CallDetailDrawer({ detail, loading, onClose }: Props) {
  useEffect(() => {
    if (!detail && !loading) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detail, loading, onClose]);

  if (!detail && !loading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 dark:bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-dark-800 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="px-6 py-4 bg-slate-50 dark:bg-dark-900/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              Карточка вызова {detail ? `#${detail.id}` : ""}
              {detail && (
                <>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-500/15 text-brand-700 dark:text-brand-400 border border-brand-500/25">
                    GCID {detail.global_call_id_cm ?? "?"}-{detail.global_call_id ?? "?"}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      getDirectionMeta(detail.direction).badgeClass
                    }`}
                  >
                    {getDirectionMeta(detail.direction).label}
                  </span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Детализация маршрута и метрик качества Cisco CUCM
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading || !detail ? (
            <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
              Загрузка данных вызова...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    <Phone className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" /> Вызывающий (Calling)
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                    {detail.calling_party_number || "—"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Устройство: <span className="font-mono text-slate-800 dark:text-slate-200">{detail.orig_device_name || "—"}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    IP: <span className="font-mono text-slate-800 dark:text-slate-200">{detail.orig_ip_addr || "—"}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Вызываемый (Final Called)
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                    {detail.final_called_party_number || detail.original_called_party_number || "—"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Устройство: <span className="font-mono text-slate-800 dark:text-slate-200">{detail.dest_device_name || "—"}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    IP: <span className="font-mono text-slate-800 dark:text-slate-200">{detail.dest_ip_addr || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 dark:bg-dark-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <Clock className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Временные метки и статус
                </div>
                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Начало (Origination):</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{formatDateTime(detail.date_time_origination)}</span>
                  <span className="text-slate-500 dark:text-slate-400">Ответ (Connect):</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{formatDateTime(detail.date_time_connect)}</span>
                  <span className="text-slate-500 dark:text-slate-400">Завершение (Disconnect):</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{formatDateTime(detail.date_time_disconnect)}</span>
                  <span className="text-slate-500 dark:text-slate-400">Длительность:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatDuration(detail.duration)} ({detail.duration} сек)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">Статус:</span>
                  <span>
                    <span
                      className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-md border ${
                        detail.answered
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                      }`}
                    >
                      {detail.answered ? "Отвечен" : "Пропущен / Неуспешен"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 dark:bg-dark-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <Server className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Причины завершения (Cause Codes)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase">Origination Cause</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white mt-1">
                      {detail.orig_cause_info
                        ? `${detail.orig_cause_info.code} — ${detail.orig_cause_info.name}`
                        : "—"}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">{detail.orig_cause_info?.description}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase">Destination Cause</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white mt-1">
                      {detail.dest_cause_info
                        ? `${detail.dest_cause_info.code} — ${detail.dest_cause_info.name}`
                        : "—"}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">{detail.dest_cause_info?.description}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Качество связи (CMR)
                </div>
                {detail.cmr_records.length === 0 ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-dark-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    Связанные CMR-записи качества речи отсутствуют.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detail.cmr_records.map((cmr) => (
                      <div key={cmr.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-900/80 text-xs space-y-2">
                        <div className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                          {cmr.device_name || "Устройство"} ({cmr.directory_number || "—"})
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-slate-600 dark:text-slate-300 font-mono">
                          <div>Tx: <b className="text-slate-900 dark:text-white">{cmr.number_packets_sent ?? "—"}</b></div>
                          <div>Rx: <b className="text-slate-900 dark:text-white">{cmr.number_packets_received ?? "—"}</b></div>
                          <div>Lost: <b className="text-rose-600 dark:text-rose-400">{cmr.number_packets_lost ?? "—"}</b></div>
                          <div>Jitter: <b className="text-indigo-600 dark:text-indigo-300">{cmr.jitter ?? "—"} ms</b></div>
                          <div>Latency: <b className="text-indigo-600 dark:text-indigo-300">{cmr.latency ?? "—"} ms</b></div>
                        </div>
                        {cmr.var_vq_metrics && (
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 break-all pt-2 border-t border-slate-200 dark:border-slate-800">
                            {cmr.var_vq_metrics}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detail.raw_extra && Object.keys(detail.raw_extra).length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Дополнительные атрибуты CUCM
                  </div>
                  <pre className="text-[11px] font-mono bg-slate-900 dark:bg-dark-900 text-emerald-300 p-4 rounded-xl overflow-x-auto max-h-60 border border-slate-800">
                    {JSON.stringify(detail.raw_extra, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
