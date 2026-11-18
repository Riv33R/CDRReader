export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0с";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}ч ${m}м ${s}с`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

export function getDirectionMeta(direction: string | undefined): { label: string; short: string; badgeClass: string } {
  switch (direction) {
    case "inbound":
      return {
        label: "↙ Входящий",
        short: "Входящий",
        badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
      };
    case "outbound":
      return {
        label: "↗ Исходящий",
        short: "Исходящий",
        badgeClass: "bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-500/30",
      };
    default:
      return {
        label: "⇄ Внутренний",
        short: "Внутренний",
        badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-400/30 dark:border-slate-600",
      };
  }
}
