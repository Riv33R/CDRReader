import asyncio
import logging
import os
import shutil
import stat
from datetime import datetime, timezone
from pathlib import Path

import paramiko
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.cdr import ImportJob
from app.services.parser import parse_file_bytes

logger = logging.getLogger(__name__)


def _unique_dest(dest_dir: Path, filename: str) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    target = dest_dir / filename
    if not target.exists():
        return target
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return dest_dir / f"{ts}_{filename}"


async def process_watch_dir_once() -> int:
    """Scan WATCH_DIR and import any ready CDR/CMR files. Returns count of processed files."""
    watch_dir = Path(settings.WATCH_DIR)
    archive_dir = Path(settings.ARCHIVE_DIR)
    error_dir = Path(settings.ERROR_DIR)

    if not watch_dir.exists():
        return 0

    processed = 0
    for entry in sorted(watch_dir.iterdir()):
        if not entry.is_file():
            continue
        if entry.name.startswith(".") or entry.name.endswith((".tmp", ".part")):
            continue

        # Ensure file is not actively being written by SFTP/copy
        try:
            size_before = entry.stat().st_size
            await asyncio.sleep(0.3)
            size_after = entry.stat().st_size
        except FileNotFoundError:
            continue
        if size_before != size_after or size_after == 0:
            continue

        async with AsyncSessionLocal() as db:
            job = ImportJob(
                filename=entry.name,
                source="watch_dir",
                file_type="cdr",
                status="processing",
            )
            db.add(job)
            await db.flush()

            try:
                content = await asyncio.to_thread(entry.read_bytes)
                stats = await parse_file_bytes(db, content, entry.name)
                job.file_type = stats.file_type
                job.total_rows = stats.total_rows
                job.inserted_rows = stats.inserted_rows
                job.duplicate_rows = stats.duplicate_rows
                job.status = "completed"
                job.finished_at = datetime.now(timezone.utc)
                await db.commit()

                dest = _unique_dest(archive_dir, entry.name)
                await asyncio.to_thread(shutil.move, str(entry), str(dest))
                processed += 1
                logger.info(
                    "Imported %s (%s): total=%d inserted=%d dup=%d",
                    entry.name,
                    stats.file_type,
                    stats.total_rows,
                    stats.inserted_rows,
                    stats.duplicate_rows,
                )
            except Exception as exc:
                await db.rollback()
                logger.exception("Failed to import watch-dir file %s: %s", entry.name, exc)
                async with AsyncSessionLocal() as err_db:
                    err_job = ImportJob(
                        filename=entry.name,
                        source="watch_dir",
                        file_type="unknown",
                        status="failed",
                        error_message=str(exc)[:2000],
                        finished_at=datetime.now(timezone.utc),
                    )
                    err_db.add(err_job)
                    await err_db.commit()
                dest = _unique_dest(error_dir, entry.name)
                await asyncio.to_thread(shutil.move, str(entry), str(dest))

    return processed


def _download_sftp_files_sync(known_filenames: set[str]) -> list[str]:
    if not settings.SFTP_HOST or not settings.SFTP_USER:
        return []

    watch_dir = Path(settings.WATCH_DIR)
    watch_dir.mkdir(parents=True, exist_ok=True)
    downloaded: list[str] = []

    transport = paramiko.Transport((settings.SFTP_HOST, settings.SFTP_PORT))
    try:
        transport.connect(username=settings.SFTP_USER, password=settings.SFTP_PASSWORD)
        sftp = paramiko.SFTPClient.from_transport(transport)
        assert sftp is not None
        try:
            for attr in sftp.listdir_attr(settings.SFTP_REMOTE_DIR):
                name = attr.filename
                if (attr.st_mode is not None and stat.S_ISDIR(attr.st_mode)) or name.startswith(".") or name in known_filenames:
                    continue
                remote_path = f"{settings.SFTP_REMOTE_DIR.rstrip('/')}/{name}"
                tmp_path = watch_dir / f".{name}.tmp"
                final_path = watch_dir / name
                if final_path.exists():
                    continue
                sftp.get(remote_path, str(tmp_path))
                os.replace(tmp_path, final_path)
                downloaded.append(name)
        finally:
            sftp.close()
    finally:
        transport.close()
    return downloaded


async def poll_sftp_once() -> list[str]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ImportJob.filename).where(ImportJob.status.in_(["completed", "failed"]))
        )
        known = set(result.scalars().all())
    return await asyncio.to_thread(_download_sftp_files_sync, known)


async def watch_dir_loop(stop_event: asyncio.Event) -> None:
    logger.info("Watch-dir worker started (dir=%s, interval=%ss)", settings.WATCH_DIR, settings.WATCH_POLL_INTERVAL)
    while not stop_event.is_set():
        try:
            await process_watch_dir_once()
        except Exception:
            logger.exception("Error in watch-dir loop")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=settings.WATCH_POLL_INTERVAL)
        except TimeoutError:
            pass


async def sftp_poller_loop(stop_event: asyncio.Event) -> None:
    logger.info("SFTP poller started (host=%s, interval=%ss)", settings.SFTP_HOST, settings.SFTP_POLL_INTERVAL)
    while not stop_event.is_set():
        try:
            downloaded = await poll_sftp_once()
            if downloaded:
                logger.info("SFTP downloaded %d file(s): %s", len(downloaded), downloaded)
        except Exception:
            logger.exception("Error in SFTP poller loop")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=settings.SFTP_POLL_INTERVAL)
        except TimeoutError:
            pass
