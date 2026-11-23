import ftplib
import io
import socket
import time
from pathlib import Path

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.cdr import CdrRecord, CmrRecord
from app.services.ftp_server import start_ftp_server, stop_ftp_server
from app.services.watcher import process_watch_dir_once
from tests.test_parser import SAMPLE_CDR_CSV, SAMPLE_CMR_CSV


def get_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.mark.asyncio
async def test_ftp_server_upload_and_ingestion(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    inbox_dir = tmp_path / "inbox"
    archive_dir = tmp_path / "archive"
    error_dir = tmp_path / "error"
    inbox_dir.mkdir()
    archive_dir.mkdir()
    error_dir.mkdir()

    monkeypatch.setattr(settings, "WATCH_DIR", str(inbox_dir))
    monkeypatch.setattr(settings, "ARCHIVE_DIR", str(archive_dir))
    monkeypatch.setattr(settings, "ERROR_DIR", str(error_dir))

    ftp_port = get_free_port()
    pasv_min = get_free_port()
    pasv_max = pasv_min + 5

    # Start FTP server on ephemeral port
    server = start_ftp_server(
        host="127.0.0.1",
        port=ftp_port,
        user="cucm_test_user",
        password="cucm_test_password",
        home_dir=inbox_dir,
        pasv_min=pasv_min,
        pasv_max=pasv_max,
    )
    assert server is not None
    time.sleep(0.3)

    try:
        # 1. Test bad login
        with pytest.raises(ftplib.error_perm):
            ftp_bad = ftplib.FTP(timeout=5)
            ftp_bad.connect("127.0.0.1", ftp_port)
            ftp_bad.login("cucm_test_user", "wrong_password")
            ftp_bad.quit()

        # 2. Test successful login and STOR upload
        ftp = ftplib.FTP(timeout=5)
        ftp.connect("127.0.0.1", ftp_port)
        welcome = ftp.login("cucm_test_user", "cucm_test_password")
        assert "230" in welcome
        ftp.set_pasv(True)

        # Upload CDR file
        cdr_filename = "cdr_Cluster01_01_202611231200_101.csv"
        cdr_bio = io.BytesIO(SAMPLE_CDR_CSV.encode("utf-8"))
        res_cdr = ftp.storbinary(f"STOR {cdr_filename}", cdr_bio)
        assert "226" in res_cdr

        # Create subfolder /cdr and upload CMR file there
        try:
            ftp.mkd("cdr")
        except ftplib.error_perm:
            pass
        ftp.cwd("cdr")
        cmr_filename = "cmr_Cluster01_01_202611231200_102.csv"
        cmr_bio = io.BytesIO(SAMPLE_CMR_CSV.encode("utf-8"))
        res_cmr = ftp.storbinary(f"STOR {cmr_filename}", cmr_bio)
        assert "226" in res_cmr

        ftp.quit()

        # Verify files arrived on disk
        uploaded_cdr = inbox_dir / cdr_filename
        uploaded_cmr = inbox_dir / "cdr" / cmr_filename
        assert uploaded_cdr.exists()
        assert uploaded_cmr.exists()

        # 3. Trigger watcher loop once to process files into DB
        processed_count = await process_watch_dir_once()
        assert processed_count == 2

        # Verify records in database
        async with AsyncSessionLocal() as db:
            cdr_count = (await db.execute(select(func.count(CdrRecord.id)))).scalar()
            cmr_count = (await db.execute(select(func.count(CmrRecord.id)))).scalar()
            assert cdr_count == 2
            assert cmr_count == 1

        # Verify files were moved to archive
        assert not uploaded_cdr.exists()
        assert not uploaded_cmr.exists()
        archive_files = list(archive_dir.glob("*"))
        assert len(archive_files) == 2

    finally:
        stop_ftp_server()
