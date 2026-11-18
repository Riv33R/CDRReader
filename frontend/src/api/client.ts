import type { CallFilters, CallsPage, CdrDetail, DashboardStats, ImportJob } from "../types/cdr";

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== "") {
      qs.set(key, String(val));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      if (data?.detail) message = String(data.detail);
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  getDashboardStats(params: {
    date_from?: string;
    date_to?: string;
    granularity?: "hour" | "day";
    direction?: string;
  }) {
    return fetchJson<DashboardStats>(`/api/dashboard/stats${buildQuery(params)}`);
  },

  getCalls(filters: CallFilters) {
    return fetchJson<CallsPage>(`/api/calls${buildQuery(filters as Record<string, string | number | undefined>)}`);
  },

  getCallDetail(id: number) {
    return fetchJson<CdrDetail>(`/api/calls/${id}`);
  },

  getExportUrl(format: "csv" | "xlsx", filters: CallFilters) {
    const { page: _p, page_size: _ps, sort_by: _sb, sort_dir: _sd, ...rest } = filters;
    return `/api/calls/export${buildQuery({ ...rest, format } as Record<string, string | number | undefined>)}`;
  },

  getImportJobs() {
    return fetchJson<ImportJob[]>("/api/imports");
  },

  async uploadFile(file: File): Promise<ImportJob> {
    const form = new FormData();
    form.append("file", file);
    return fetchJson<ImportJob>("/api/imports/upload", {
      method: "POST",
      body: form,
    });
  },
};
