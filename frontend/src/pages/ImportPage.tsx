import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileUp, RefreshCw, XCircle, Loader2 } from "lucide-react";
import { api } from "../api/client";
import type { ImportJob } from "../types/cdr";
import { formatDateTime } from "../utils/format";

export function ImportPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadJobs = useCallback(() => {
    setLoading(true);
    api
      .getImportJobs()
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage(null);
    let totalInserted = 0;
    let totalDup = 0;
    try {
      for (const file of Array.from(files)) {
        const res = await api.uploadFile(file);
        totalInserted += res.inserted_rows;
        totalDup += res.duplicate_rows;
      }
      setMessage({
        type: "ok",
        text: `Импорт завершён: добавлено ${totalInserted} записей, пропущено дубликатов: ${totalDup}.`,
      });
      loadJobs();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : "Ошибка загрузки файла",
      });
      loadJobs();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Загрузка и импорт CDR / CMR</h1>
          <p className="text-xs text-slate-500">
            Ручная загрузка файлов и мониторинг автоматического импорта (SFTP / watch-dir)
          </p>
        </div>
        <button
          onClick={loadJobs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Обновить
        </button>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`block border border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-sky-600 bg-sky-50"
            : "border-slate-300 bg-white hover:border-sky-500"
        }`}
      >
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="w-7 h-7 text-sky-700 animate-spin" />
          ) : (
            <FileUp className="w-7 h-7 text-sky-700" />
          )}
          <div className="text-xs font-semibold text-slate-800">
            {uploading
              ? "Выполняется парсинг и запись в базу данных..."
              : "Перетащите файлы CUCM CDR/CMR сюда или нажмите для выбора"}
          </div>
          <div className="text-[11px] text-slate-500">
            Форматы: CSV, файлы выгрузки CUCM без расширения (cdr_* / cmr_*), архивы .gz и .zip
          </div>
        </div>
      </label>

      {message && (
        <div
          className={`p-3 rounded-md text-xs border ${
            message.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 font-semibold text-xs uppercase tracking-wider text-slate-600">
          Журнал задач импорта
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2.5">Файл</th>
                <th className="px-3 py-2.5">Источник</th>
                <th className="px-3 py-2.5">Тип</th>
                <th className="px-3 py-2.5">Статус</th>
                <th className="px-3 py-2.5">Всего</th>
                <th className="px-3 py-2.5">Добавлено</th>
                <th className="px-3 py-2.5">Дубликаты</th>
                <th className="px-3 py-2.5">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Загрузок пока не было
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-medium text-slate-900">
                      <div>{job.filename}</div>
                      {job.error_message && (
                        <div className="text-[11px] text-rose-700 mt-0.5">{job.error_message}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-600">{job.source}</td>
                    <td className="px-3 py-2 uppercase font-mono font-medium text-slate-600">
                      {job.file_type}
                    </td>
                    <td className="px-3 py-2">
                      {job.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Успешно
                        </span>
                      ) : job.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border bg-rose-50 text-rose-800 border-rose-200 text-[11px] font-medium">
                          <XCircle className="w-3 h-3" /> Ошибка
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 font-medium">Обработка...</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">{job.total_rows}</td>
                    <td className="px-3 py-2 font-mono tabular-nums font-semibold text-teal-700">
                      {job.inserted_rows}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-slate-500">{job.duplicate_rows}</td>
                    <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(job.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
