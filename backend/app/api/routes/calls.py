import math
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import and_, desc, asc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cause_codes import get_cause_info
from app.core.database import get_db
from app.models.cdr import CdrRecord, CmrRecord
from app.schemas.cdr import CallsPageOut, CauseInfoOut, CdrDetailOut, CdrRecordOut, CmrRecordOut
from app.services.export import build_csv_bytes, build_xlsx_bytes

router = APIRouter(prefix="/calls", tags=["calls"])


def _to_cause_out(code: int | None) -> CauseInfoOut | None:
    if code is None:
        return None
    info = get_cause_info(code)
    return CauseInfoOut(code=info.code, name=info.name, description=info.description, category=info.category)


def _serialize_cdr(rec: CdrRecord) -> CdrRecordOut:
    out = CdrRecordOut.model_validate(rec)
    out.orig_cause_info = _to_cause_out(rec.orig_cause_value)
    out.dest_cause_info = _to_cause_out(rec.dest_cause_value)
    return out


def _build_call_filters(
    date_from: datetime | None,
    date_to: datetime | None,
    number: str | None,
    calling: str | None,
    called: str | None,
    device: str | None,
    cause_code: int | None,
    answered: bool | None,
    min_duration: int | None,
    max_duration: int | None,
) -> list[Any]:
    filters: list[Any] = []
    if date_from is not None:
        filters.append(CdrRecord.date_time_origination >= date_from)
    if date_to is not None:
        filters.append(CdrRecord.date_time_origination <= date_to)
    if number:
        like_pat = f"%{number.strip()}%"
        filters.append(
            or_(
                CdrRecord.calling_party_number.ilike(like_pat),
                CdrRecord.original_called_party_number.ilike(like_pat),
                CdrRecord.final_called_party_number.ilike(like_pat),
                CdrRecord.last_redirect_dn.ilike(like_pat),
            )
        )
    if calling:
        filters.append(CdrRecord.calling_party_number.ilike(f"%{calling.strip()}%"))
    if called:
        like_called = f"%{called.strip()}%"
        filters.append(
            or_(
                CdrRecord.final_called_party_number.ilike(like_called),
                CdrRecord.original_called_party_number.ilike(like_called),
            )
        )
    if device:
        like_dev = f"%{device.strip()}%"
        filters.append(
            or_(
                CdrRecord.orig_device_name.ilike(like_dev),
                CdrRecord.dest_device_name.ilike(like_dev),
            )
        )
    if cause_code is not None:
        filters.append(
            or_(
                CdrRecord.orig_cause_value == cause_code,
                CdrRecord.dest_cause_value == cause_code,
            )
        )
    if answered is not None:
        filters.append(CdrRecord.answered.is_(answered))
    if min_duration is not None:
        filters.append(CdrRecord.duration >= min_duration)
    if max_duration is not None:
        filters.append(CdrRecord.duration <= max_duration)
    return filters


@router.get("", response_model=CallsPageOut)
async def list_calls(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("date_time_origination"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    number: str | None = None,
    calling: str | None = None,
    called: str | None = None,
    device: str | None = None,
    cause_code: int | None = None,
    answered: bool | None = None,
    min_duration: int | None = Query(None, ge=0),
    max_duration: int | None = Query(None, ge=0),
    db: AsyncSession = Depends(get_db),
) -> CallsPageOut:
    filters = _build_call_filters(
        date_from, date_to, number, calling, called, device, cause_code, answered, min_duration, max_duration
    )

    count_stmt = select(func.count(CdrRecord.id))
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = int((await db.execute(count_stmt)).scalar() or 0)

    sort_col_map = {
        "date_time_origination": CdrRecord.date_time_origination,
        "duration": CdrRecord.duration,
        "calling_party_number": CdrRecord.calling_party_number,
        "final_called_party_number": CdrRecord.final_called_party_number,
    }
    sort_col = sort_col_map.get(sort_by, CdrRecord.date_time_origination)
    order_expr = asc(sort_col) if sort_dir == "asc" else desc(sort_col)

    stmt = select(CdrRecord)
    if filters:
        stmt = stmt.where(*filters)
    stmt = stmt.order_by(order_expr, desc(CdrRecord.id)).offset((page - 1) * page_size).limit(page_size)

    records = (await db.execute(stmt)).scalars().all()
    pages = max(1, math.ceil(total / page_size))

    return CallsPageOut(
        items=[_serialize_cdr(r) for r in records],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/export")
async def export_calls(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    number: str | None = None,
    calling: str | None = None,
    called: str | None = None,
    device: str | None = None,
    cause_code: int | None = None,
    answered: bool | None = None,
    min_duration: int | None = Query(None, ge=0),
    max_duration: int | None = Query(None, ge=0),
    limit: int = Query(10000, ge=1, le=50000),
    db: AsyncSession = Depends(get_db),
) -> Response:
    filters = _build_call_filters(
        date_from, date_to, number, calling, called, device, cause_code, answered, min_duration, max_duration
    )
    stmt = select(CdrRecord)
    if filters:
        stmt = stmt.where(*filters)
    stmt = stmt.order_by(desc(CdrRecord.date_time_origination), desc(CdrRecord.id)).limit(limit)

    records = (await db.execute(stmt)).scalars().all()

    if format == "xlsx":
        payload = build_xlsx_bytes(records)
        return Response(
            content=payload,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="cdr_export.xlsx"'},
        )

    payload = build_csv_bytes(records)
    return Response(
        content=payload,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="cdr_export.csv"'},
    )


@router.get("/{call_id}", response_model=CdrDetailOut)
async def get_call_detail(call_id: int, db: AsyncSession = Depends(get_db)) -> CdrDetailOut:
    rec = (await db.execute(select(CdrRecord).where(CdrRecord.id == call_id))).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status_code=404, detail="Call record not found")

    cmr_list: list[CmrRecordOut] = []
    if rec.global_call_id is not None and rec.global_call_id_cm is not None:
        cmr_stmt = select(CmrRecord).where(
            and_(
                CmrRecord.global_call_id_cm == rec.global_call_id_cm,
                CmrRecord.global_call_id == rec.global_call_id,
            )
        )
        cmr_rows = (await db.execute(cmr_stmt)).scalars().all()
        cmr_list = [CmrRecordOut.model_validate(c) for c in cmr_rows]

    base = _serialize_cdr(rec)
    return CdrDetailOut(
        **base.model_dump(),
        orig_leg_call_identifier=rec.orig_leg_call_identifier,
        dest_leg_identifier=rec.dest_leg_identifier,
        raw_extra=rec.raw_extra,
        cmr_records=cmr_list,
    )
