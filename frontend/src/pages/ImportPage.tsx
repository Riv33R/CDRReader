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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Импорт CDR / CMR файлов</h1>
          <p className="text-sm text-slate-500">
            Ручная загрузка или автоматический приём из watch-dir / SFTP
          </p>
        </div>
        <button
          onClick={loadJobs}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Обновить
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
        className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-white hover:border-blue-400"
        }`}
      >
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          ) : (
            <FileUp className="w-10 h-10 text-blue-600" />
          )}
          <div className="text-base font-medium text-slate-800">
            {uploading
              ? "Выполняется парсинг и загрузка в БД..."
              : "Перетащите файлы CUCM CDR/CMR сюда или нажмите для выбора"}
          </div>
          <div className="text-xs text-slate-500">
            Поддерживаются CSV, файлы выгрузки CUCM без расширения (cdr_* / cmr_*), .gz и .zip архивы
          </div>
        </div>
      </label>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm border ${
            message.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 font-semibold text-sm text-slate-800">
          История импортов
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Файл</th>
                <th className="px-4 py-3">Источник</th>
                <th className="px-4 py-3">Тип</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Всего строк</th>
                <th className="px-4 py-3">Добавлено</th>
                <th className="px-4 py-3">Дубликаты</th>
                <th className="px-4 py-3">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Загрузок пока не было
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>{job.filename}</div>
                      {job.error_message && (
                        <div className="text-xs text-rose-600 mt-0.5">{job.error_message}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{job.source}</td>
                    <td className="px-4 py-3 uppercase text-xs font-medium text-slate-600">
                      {job.file_type}
                    </td>
                    <td className="px-4 py-3">
                      {job.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Успешно
                        </span>
                      ) : job.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 text-xs font-medium">
                          <XCircle className="w-4 h-4" /> Ошибка
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">В обработке...</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{job.total_rows}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{job.inserted_rows}</td>
                    <td className="px-4 py-3 text-slate-500">{job.duplicate_rows}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
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
