from typing import Any

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["config"])


@router.get("/config")
async def get_public_config() -> dict[str, Any]:
    """Return public application configuration and feature toggles."""
    return {
        "app_name": settings.APP_NAME,
        "cdr_analytics_enabled": settings.ENABLE_CDR_ANALYTICS,
        "cmr_analytics_enabled": settings.ENABLE_CMR_ANALYTICS,
        "ftp_server_enabled": settings.FTP_SERVER_ENABLED,
    }
