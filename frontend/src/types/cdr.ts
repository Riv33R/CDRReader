export type CallDirection = "inbound" | "outbound" | "internal";

export interface CauseInfo {
  code: number;
  name: string;
  description: string;
  category: string;
}

export interface CmrRecord {
  id: number;
  device_name: string | null;
  directory_number: string | null;
  date_time_stamp: string | null;
  number_packets_sent: number | null;
  number_packets_received: number | null;
  number_packets_lost: number | null;
  jitter: number | null;
  latency: number | null;
  var_vq_metrics: string | null;
}

export interface CdrRecord {
  id: number;
  global_call_id_cm: number | null;
  global_call_id: number | null;
  date_time_origination: string | null;
  date_time_connect: string | null;
  date_time_disconnect: string | null;
  calling_party_number: string | null;
  original_called_party_number: string | null;
  final_called_party_number: string | null;
  last_redirect_dn: string | null;
  duration: number;
  answered: boolean;
  direction: CallDirection;
  orig_cause_value: number | null;
  dest_cause_value: number | null;
  orig_cause_info: CauseInfo | null;
  dest_cause_info: CauseInfo | null;
  orig_device_name: string | null;
  dest_device_name: string | null;
  orig_ip_addr: string | null;
  dest_ip_addr: string | null;
  source_file: string | null;
}

export interface CdrDetail extends CdrRecord {
  orig_leg_call_identifier: number | null;
  dest_leg_identifier: number | null;
  raw_extra: Record<string, unknown> | null;
  cmr_records: CmrRecord[];
}

export interface CallsPage {
  items: CdrRecord[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ImportJob {
  id: number;
  filename: string;
  source: string;
  file_type: string;
  status: string;
  total_rows: number;
  inserted_rows: number;
  duplicate_rows: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface TimeSeriesPoint {
  bucket: string;
  total: number;
  answered: number;
  missed: number;
  avg_duration: number;
}

export interface CauseDistributionPoint {
  code: number;
  name: string;
  description: string;
  count: number;
}

export interface TopItemPoint {
  label: string;
  count: number;
  total_duration: number;
}

export interface DashboardStats {
  total_calls: number;
  answered_calls: number;
  missed_calls: number;
  answer_rate: number;
  total_duration: number;
  avg_duration: number;
  time_series: TimeSeriesPoint[];
  cause_distribution: CauseDistributionPoint[];
  top_callers: TopItemPoint[];
  top_called: TopItemPoint[];
  top_devices: TopItemPoint[];
}

export interface CallFilters {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
  number?: string;
  calling?: string;
  called?: string;
  device?: string;
  cause_code?: string;
  answered?: "" | "true" | "false";
  direction?: "" | CallDirection;
  min_duration?: string;
  max_duration?: string;
}
