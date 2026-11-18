from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.cdr import DashboardStatsOut
from app.services.analytics import get_dashboard_stats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsOut)
async def dashboard_stats(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    granularity: str = Query("day", pattern="^(hour|day)$"),
    direction: str | None = Query(None, pattern="^(inbound|outbound|internal)$"),
    db: AsyncSession = Depends(get_db),
) -> DashboardStatsOut:
    return await get_dashboard_stats(
        db,
        date_from=date_from,
        date_to=date_to,
        granularity=granularity,
        direction=direction,
    )
