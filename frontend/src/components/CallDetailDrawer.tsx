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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Детали вызова {detail ? `#${detail.id}` : ""}
            </h2>
            {detail && (
              <p className="text-xs text-slate-500">
                Global Call ID: {detail.global_call_id_cm ?? "?"}-{detail.global_call_id ?? "?"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || !detail ? (
            <div className="text-center py-12 text-slate-500">Загрузка данных...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                    <Phone className="w-3.5 h-3.5" /> Вызывающий (Calling)
                  </div>
                  <div className="text-base font-semibold text-slate-900">
                    {detail.calling_party_number || "—"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Устройство: {detail.orig_device_name || "—"}
                  </div>
                  <div className="text-xs text-slate-500">IP: {detail.orig_ip_addr || "—"}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                    <Phone className="w-3.5 h-3.5" /> Вызываемый (Final Called)
                  </div>
                  <div className="text-base font-semibold text-slate-900">
                    {detail.final_called_party_number || detail.original_called_party_number || "—"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Устройство: {detail.dest_device_name || "—"}
                  </div>
                  <div className="text-xs text-slate-500">IP: {detail.dest_ip_addr || "—"}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Clock className="w-4 h-4 text-blue-600" /> Временные метки и статус
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-slate-500">Начало (Origination):</span>
                  <span className="font-medium">{formatDateTime(detail.date_time_origination)}</span>
                  <span className="text-slate-500">Ответ (Connect):</span>
                  <span className="font-medium">{formatDateTime(detail.date_time_connect)}</span>
                  <span className="text-slate-500">Завершение (Disconnect):</span>
                  <span className="font-medium">{formatDateTime(detail.date_time_disconnect)}</span>
                  <span className="text-slate-500">Длительность:</span>
                  <span className="font-semibold">{formatDuration(detail.duration)} ({detail.duration}с)</span>
                  <span className="text-slate-500">Статус:</span>
                  <span>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        detail.answered
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {detail.answered ? "Отвечен" : "Пропущен / Неуспешен"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Server className="w-4 h-4 text-indigo-600" /> Причины завершения (Cause Codes)
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Origination Cause</div>
                    <div className="font-medium">
                      {detail.orig_cause_info
                        ? `${detail.orig_cause_info.code} — ${detail.orig_cause_info.name}`
                        : "—"}
                    </div>
                    <div className="text-xs text-slate-500">{detail.orig_cause_info?.description}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Destination Cause</div>
                    <div className="font-medium">
                      {detail.dest_cause_info
                        ? `${detail.dest_cause_info.code} — ${detail.dest_cause_info.name}`
                        : "—"}
                    </div>
                    <div className="text-xs text-slate-500">{detail.dest_cause_info?.description}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Activity className="w-4 h-4 text-emerald-600" /> Качество связи (CMR)
                </div>
                {detail.cmr_records.length === 0 ? (
                  <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    Связанные CMR-записи качества речи не найдены.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detail.cmr_records.map((cmr) => (
                      <div key={cmr.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm space-y-1">
                        <div className="font-semibold text-slate-800">
                          {cmr.device_name || "Устройство"} ({cmr.directory_number || "—"})
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                          <div>Отправлено пак.: <b>{cmr.number_packets_sent ?? "—"}</b></div>
                          <div>Получено пак.: <b>{cmr.number_packets_received ?? "—"}</b></div>
                          <div>Потери: <b>{cmr.number_packets_lost ?? "—"}</b></div>
                          <div>Jitter: <b>{cmr.jitter ?? "—"} мс</b></div>
                          <div>Latency: <b>{cmr.latency ?? "—"} мс</b></div>
                        </div>
                        {cmr.var_vq_metrics && (
                          <div className="text-xs text-slate-500 break-all pt-1">
                            VQ: {cmr.var_vq_metrics}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detail.raw_extra && Object.keys(detail.raw_extra).length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-800">Дополнительные поля CUCM</div>
                  <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto max-h-64">
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
