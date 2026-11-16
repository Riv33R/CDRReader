import { X, Activity, Phone, Clock, Server } from "lucide-react";
import type { CdrDetail } from "../types/cdr";
import { formatDateTime, formatDuration } from "../utils/format";

interface Props {
  detail: CdrDetail | null;
  loading: boolean;
  onClose: () => void;
}

export function CallDetailDrawer({ detail, loading, onClose }: Props) {
  if (!detail && !loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
              Карточка вызова {detail ? `#${detail.id}` : ""}
            </h2>
            {detail && (
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Global Call ID: {detail.global_call_id_cm ?? "?"}-{detail.global_call_id ?? "?"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading || !detail ? (
            <div className="text-center py-12 text-xs text-slate-500">Загрузка данных вызова...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    <Phone className="w-3.5 h-3.5" /> Вызывающий (Calling)
                  </div>
                  <div className="text-base font-mono font-semibold text-slate-900">
                    {detail.calling_party_number || "—"}
                  </div>
                  <div className="text-xs text-slate-600 mt-1.5">
                    Устройство: <span className="font-mono">{detail.orig_device_name || "—"}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    IP: <span className="font-mono">{detail.orig_ip_addr || "—"}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    <Phone className="w-3.5 h-3.5" /> Вызываемый (Final Called)
                  </div>
                  <div className="text-base font-mono font-semibold text-slate-900">
                    {detail.final_called_party_number || detail.original_called_party_number || "—"}
                  </div>
                  <div className="text-xs text-slate-600 mt-1.5">
                    Устройство: <span className="font-mono">{detail.dest_device_name || "—"}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    IP: <span className="font-mono">{detail.dest_ip_addr || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-md border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                  <Clock className="w-3.5 h-3.5 text-sky-700" /> Временные метки и статус
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-slate-500">Начало (Origination):</span>
                  <span className="font-mono text-slate-900">{formatDateTime(detail.date_time_origination)}</span>
                  <span className="text-slate-500">Ответ (Connect):</span>
                  <span className="font-mono text-slate-900">{formatDateTime(detail.date_time_connect)}</span>
                  <span className="text-slate-500">Завершение (Disconnect):</span>
                  <span className="font-mono text-slate-900">{formatDateTime(detail.date_time_disconnect)}</span>
                  <span className="text-slate-500">Длительность:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatDuration(detail.duration)} ({detail.duration} сек)
                  </span>
                  <span className="text-slate-500">Статус:</span>
                  <span>
                    <span
                      className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-sm border ${
                        detail.answered
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {detail.answered ? "Отвечен" : "Пропущен / Неуспешен"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-md border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                  <Server className="w-3.5 h-3.5 text-slate-600" /> Причины завершения (Cause Codes)
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase">Origination Cause</div>
                    <div className="font-mono font-medium text-slate-900 mt-0.5">
                      {detail.orig_cause_info
                        ? `${detail.orig_cause_info.code} — ${detail.orig_cause_info.name}`
                        : "—"}
                    </div>
                    <div className="text-slate-500 mt-0.5">{detail.orig_cause_info?.description}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase">Destination Cause</div>
                    <div className="font-mono font-medium text-slate-900 mt-0.5">
                      {detail.dest_cause_info
                        ? `${detail.dest_cause_info.code} — ${detail.dest_cause_info.name}`
                        : "—"}
                    </div>
                    <div className="text-slate-500 mt-0.5">{detail.dest_cause_info?.description}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                  <Activity className="w-3.5 h-3.5 text-teal-700" /> Качество связи (CMR)
                </div>
                {detail.cmr_records.length === 0 ? (
                  <div className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-md border border-slate-200">
                    Связанные CMR-записи качества речи отсутствуют.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {detail.cmr_records.map((cmr) => (
                      <div key={cmr.id} className="p-3.5 rounded-md border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                        <div className="font-mono font-semibold text-slate-800">
                          {cmr.device_name || "Устройство"} ({cmr.directory_number || "—"})
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-slate-600 font-mono">
                          <div>Tx Packets: <b>{cmr.number_packets_sent ?? "—"}</b></div>
                          <div>Rx Packets: <b>{cmr.number_packets_received ?? "—"}</b></div>
                          <div>Lost: <b>{cmr.number_packets_lost ?? "—"}</b></div>
                          <div>Jitter: <b>{cmr.jitter ?? "—"} ms</b></div>
                          <div>Latency: <b>{cmr.latency ?? "—"} ms</b></div>
                        </div>
                        {cmr.var_vq_metrics && (
                          <div className="text-[11px] font-mono text-slate-500 break-all pt-1 border-t border-slate-200">
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
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Дополнительные атрибуты CUCM
                  </div>
                  <pre className="text-[11px] font-mono bg-slate-950 text-slate-200 p-3.5 rounded-md overflow-x-auto max-h-60 border border-slate-800">
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
