from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.cdr import ImportJob
from app.schemas.cdr import ImportJobOut
from app.services.parser import parse_file_bytes

router = APIRouter(prefix="/imports", tags=["imports"])


@router.get("", response_model=list[ImportJobOut])
async def list_import_jobs(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[ImportJobOut]:
    stmt = select(ImportJob).order_by(desc(ImportJob.created_at), desc(ImportJob.id)).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [ImportJobOut.model_validate(r) for r in rows]


@router.post("/upload", response_model=ImportJobOut)
async def upload_cdr_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> ImportJobOut:
    filename = file.filename or "uploaded_cdr.csv"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    job = ImportJob(
        filename=filename[:255],
        source="upload",
        file_type="cdr",
        status="processing",
    )
    db.add(job)
    await db.flush()

    try:
        stats = await parse_file_bytes(db, content, filename)
        job.file_type = stats.file_type
        job.total_rows = stats.total_rows
        job.inserted_rows = stats.inserted_rows
        job.duplicate_rows = stats.duplicate_rows
        if stats.skipped:
            job.status = "skipped"
            job.error_message = stats.skip_reason
        else:
            job.status = "completed"
        job.finished_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(job)
        return ImportJobOut.model_validate(job)
    except ValueError as exc:
        await db.rollback()
        err_job = ImportJob(
            filename=filename[:255],
            source="upload",
            file_type="unknown",
            status="failed",
            error_message=str(exc),
            finished_at=datetime.now(timezone.utc),
        )
        db.add(err_job)
        await db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        await db.rollback()
        err_job = ImportJob(
            filename=filename[:255],
            source="upload",
            file_type="unknown",
            status="failed",
            error_message=str(exc)[:2000],
            finished_at=datetime.now(timezone.utc),
        )
        db.add(err_job)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {exc}") from exc
