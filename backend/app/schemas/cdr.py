from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CauseInfoOut(BaseModel):
    code: int
    name: str
    description: str
    category: str


class CmrRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_name: str | None = None
    directory_number: str | None = None
    date_time_stamp: datetime | None = None
    number_packets_sent: int | None = None
    number_packets_received: int | None = None
    number_packets_lost: int | None = None
    jitter: int | None = None
    latency: int | None = None
    var_vq_metrics: str | None = None


class CdrRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    global_call_id_cm: int | None = None
    global_call_id: int | None = None
    date_time_origination: datetime | None = None
    date_time_connect: datetime | None = None
    date_time_disconnect: datetime | None = None
    calling_party_number: str | None = None
    original_called_party_number: str | None = None
    final_called_party_number: str | None = None
    last_redirect_dn: str | None = None
    duration: int
    answered: bool
    orig_cause_value: int | None = None
    dest_cause_value: int | None = None
    orig_cause_info: CauseInfoOut | None = None
    dest_cause_info: CauseInfoOut | None = None
    orig_device_name: str | None = None
    dest_device_name: str | None = None
    orig_ip_addr: str | None = None
    dest_ip_addr: str | None = None
    source_file: str | None = None


class CdrDetailOut(CdrRecordOut):
    orig_leg_call_identifier: int | None = None
    dest_leg_identifier: int | None = None
    raw_extra: dict[str, Any] | None = None
    cmr_records: list[CmrRecordOut] = []


class CallsPageOut(BaseModel):
    items: list[CdrRecordOut]
    total: int
    page: int
    page_size: int
    pages: int


class ImportJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    source: str
    file_type: str
    status: str
    total_rows: int
    inserted_rows: int
    duplicate_rows: int
    error_message: str | None = None
    created_at: datetime
    finished_at: datetime | None = None


class TimeSeriesPoint(BaseModel):
    bucket: str
    total: int
    answered: int
    missed: int
    avg_duration: float


class CauseDistributionPoint(BaseModel):
    code: int
    name: str
    description: str
    count: int


class TopItemPoint(BaseModel):
    label: str
    count: int
    total_duration: int


class DashboardStatsOut(BaseModel):
    total_calls: int
    answered_calls: int
    missed_calls: int
    answer_rate: float
    total_duration: int
    avg_duration: float
    time_series: list[TimeSeriesPoint]
    cause_distribution: list[CauseDistributionPoint]
    top_callers: list[TopItemPoint]
    top_called: list[TopItemPoint]
    top_devices: list[TopItemPoint]
