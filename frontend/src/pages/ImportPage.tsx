import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileUp, RefreshCw, XCircle, Loader2, MinusCircle } from "lucide-react";
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
      .catch((err) =>
        setMessage({
          type: "err",
          text: err instanceof Error ? err.message : "Не удалось загрузить журнал импорта",
        })
      )
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Импорт CDR / CMR файлов</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ручная загрузка или автоматический приём из watch-dir / системного SFTP
          </p>
        </div>
        <button
          onClick={loadJobs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
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
        className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-brand-500 bg-brand-500/10"
            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800/90 hover:border-brand-500/60"
        }`}
      >
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-brand-500 dark:text-brand-400 animate-spin" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <FileUp className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
          )}
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {uploading
              ? "Выполняется парсинг и запись в PostgreSQL..."
              : "Перетащите файлы CUCM CDR/CMR сюда или нажмите для выбора"}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Форматы: CSV, файлы выгрузки CUCM без расширения (cdr_* / cmr_*), архивы .gz и .zip
          </div>
        </div>
      </label>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            message.type === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-dark-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-900/60 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Журнал задач импорта
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-dark-900/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Файл</th>
                <th className="px-4 py-3">Источник</th>
                <th className="px-4 py-3">Тип</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Всего</th>
                <th className="px-4 py-3">Добавлено</th>
                <th className="px-4 py-3">Дубликаты</th>
                <th className="px-4 py-3">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    Загрузок пока не было
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                      <div>{job.filename}</div>
                      {job.error_message && (
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{job.error_message}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">{job.source}</td>
                    <td className="px-4 py-2.5 uppercase font-mono font-semibold text-indigo-600 dark:text-indigo-300">
                      {job.file_type}
                    </td>
                    <td className="px-4 py-2.5">
                      {job.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Успешно
                        </span>
                      ) : job.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[11px] font-semibold">
                          <XCircle className="w-3 h-3" /> Ошибка
                        </span>
                      ) : job.status === "skipped" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 text-[11px] font-semibold" title={job.error_message || undefined}>
                          <MinusCircle className="w-3 h-3" /> Пропущен
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-600 dark:text-amber-300 font-semibold">Обработка...</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700 dark:text-slate-200">{job.total_rows}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {job.inserted_rows}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {job.duplicate_rows}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
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
