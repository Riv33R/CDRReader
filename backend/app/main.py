import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import calls, dashboard, health, imports
from app.core.config import settings
from app.services.watcher import sftp_poller_loop, watch_dir_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    stop_event = asyncio.Event()
    tasks: list[asyncio.Task] = []

    if settings.WATCH_DIR_ENABLED:
        tasks.append(asyncio.create_task(watch_dir_loop(stop_event)))
    if settings.SFTP_POLLER_ENABLED:
        tasks.append(asyncio.create_task(sftp_poller_loop(stop_event)))

    try:
        yield
    finally:
        stop_event.set()
        for t in tasks:
            t.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(calls.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
