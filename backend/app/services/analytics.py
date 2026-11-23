from datetime import datetime
from typing import Any

from sqlalchemy import Integer, case, cast, func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cause_codes import get_cause_info
from app.core.config import settings
from app.models.cdr import CdrRecord
from app.schemas.cdr import (
    CauseDistributionPoint,
    DashboardStatsOut,
    TimeSeriesPoint,
    TopItemPoint,
)


async def get_dashboard_stats(
    db: AsyncSession,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    granularity: str = "day",
    direction: str | None = None,
) -> DashboardStatsOut:
    """Aggregate CDR statistics for the dashboard."""
    if not settings.ENABLE_CDR_ANALYTICS:
        return DashboardStatsOut(
            total_calls=0,
            answered_calls=0,
            missed_calls=0,
            answer_rate=0.0,
            total_duration=0,
            avg_duration=0.0,
            time_series=[],
            cause_distribution=[],
            top_callers=[],
            top_called=[],
            top_devices=[],
        )

    filters: list[Any] = []
    if date_from is not None:
        filters.append(CdrRecord.date_time_origination >= date_from)
    if date_to is not None:
        filters.append(CdrRecord.date_time_origination <= date_to)
    if direction:
        filters.append(CdrRecord.direction == direction)

    # 1. KPI summary
    kpi_stmt = select(
        func.count(CdrRecord.id).label("total"),
        func.coalesce(func.sum(cast(CdrRecord.answered, Integer)), 0).label("answered"),
        func.coalesce(func.sum(CdrRecord.duration), 0).label("total_duration"),
        func.coalesce(
            func.avg(case((CdrRecord.answered.is_(True), CdrRecord.duration), else_=None)),
            0.0,
        ).label("avg_duration"),
    )
    if filters:
        kpi_stmt = kpi_stmt.where(*filters)

    kpi_row = (await db.execute(kpi_stmt)).one()
    total_calls = int(kpi_row.total or 0)
    answered_calls = int(kpi_row.answered or 0)
    missed_calls = max(0, total_calls - answered_calls)
    answer_rate = round((answered_calls / total_calls) * 100, 1) if total_calls > 0 else 0.0
    total_duration = int(kpi_row.total_duration or 0)
    avg_duration = round(float(kpi_row.avg_duration or 0.0), 1)

    # 2. Time series
    trunc_unit = "hour" if granularity == "hour" else "day"
    bucket_col = func.date_trunc(literal_column(f"'{trunc_unit}'"), CdrRecord.date_time_origination).label("bucket")
    ts_stmt = (
        select(
            bucket_col,
            func.count(CdrRecord.id).label("total"),
            func.coalesce(func.sum(cast(CdrRecord.answered, Integer)), 0).label("answered"),
            func.coalesce(func.avg(CdrRecord.duration), 0.0).label("avg_duration"),
        )
        .where(CdrRecord.date_time_origination.is_not(None), *filters)
        .group_by(literal_column("bucket"))
        .order_by(literal_column("bucket"))
    )
    ts_rows = (await db.execute(ts_stmt)).all()
    time_series = [
        TimeSeriesPoint(
            bucket=row.bucket.strftime("%Y-%m-%d %H:00" if trunc_unit == "hour" else "%Y-%m-%d"),
            total=int(row.total),
            answered=int(row.answered),
            missed=max(0, int(row.total) - int(row.answered)),
            avg_duration=round(float(row.avg_duration or 0.0), 1),
        )
        for row in ts_rows
        if row.bucket is not None
    ]

    # 3. Cause code distribution (prefer non-zero dest_cause_value, fallback to orig_cause_value)
    cause_expr = func.coalesce(
        func.nullif(CdrRecord.dest_cause_value, 0),
        func.nullif(CdrRecord.orig_cause_value, 0),
        0,
    ).label("cause_code")
    cause_stmt = (
        select(cause_expr, func.count(CdrRecord.id).label("cnt"))
        .where(*filters)
        .group_by(literal_column("cause_code"))
        .order_by(func.count(CdrRecord.id).desc())
        .limit(10)
    )
    cause_rows = (await db.execute(cause_stmt)).all()
    cause_distribution = []
    for row in cause_rows:
        info = get_cause_info(int(row.cause_code))
        cause_distribution.append(
            CauseDistributionPoint(
                code=info.code,
                name=info.name,
                description=info.description,
                count=int(row.cnt),
            )
        )

    # 4. Top callers
    caller_stmt = (
        select(
            CdrRecord.calling_party_number.label("label"),
            func.count(CdrRecord.id).label("cnt"),
            func.coalesce(func.sum(CdrRecord.duration), 0).label("dur"),
        )
        .where(CdrRecord.calling_party_number.is_not(None), CdrRecord.calling_party_number != "", *filters)
        .group_by(CdrRecord.calling_party_number)
        .order_by(func.count(CdrRecord.id).desc())
        .limit(10)
    )
    top_callers = [
        TopItemPoint(label=r.label, count=int(r.cnt), total_duration=int(r.dur))
        for r in (await db.execute(caller_stmt)).all()
    ]

    # 5. Top called numbers
    called_stmt = (
        select(
            CdrRecord.final_called_party_number.label("label"),
            func.count(CdrRecord.id).label("cnt"),
            func.coalesce(func.sum(CdrRecord.duration), 0).label("dur"),
        )
        .where(CdrRecord.final_called_party_number.is_not(None), CdrRecord.final_called_party_number != "", *filters)
        .group_by(CdrRecord.final_called_party_number)
        .order_by(func.count(CdrRecord.id).desc())
        .limit(10)
    )
    top_called = [
        TopItemPoint(label=r.label, count=int(r.cnt), total_duration=int(r.dur))
        for r in (await db.execute(called_stmt)).all()
    ]

    # 6. Top devices / trunks
    dev_stmt = (
        select(
            CdrRecord.dest_device_name.label("label"),
            func.count(CdrRecord.id).label("cnt"),
            func.coalesce(func.sum(CdrRecord.duration), 0).label("dur"),
        )
        .where(CdrRecord.dest_device_name.is_not(None), CdrRecord.dest_device_name != "", *filters)
        .group_by(CdrRecord.dest_device_name)
        .order_by(func.count(CdrRecord.id).desc())
        .limit(10)
    )
    top_devices = [
        TopItemPoint(label=r.label, count=int(r.cnt), total_duration=int(r.dur))
        for r in (await db.execute(dev_stmt)).all()
    ]

    return DashboardStatsOut(
        total_calls=total_calls,
        answered_calls=answered_calls,
        missed_calls=missed_calls,
        answer_rate=answer_rate,
        total_duration=total_duration,
        avg_duration=avg_duration,
        time_series=time_series,
        cause_distribution=cause_distribution,
        top_callers=top_callers,
        top_called=top_called,
        top_devices=top_devices,
    )
