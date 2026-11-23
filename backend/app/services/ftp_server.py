import logging
import threading
from pathlib import Path
from typing import Any

from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer

from app.core.config import settings

logger = logging.getLogger(__name__)

_ftp_server_instance: FTPServer | None = None
_ftp_thread: threading.Thread | None = None


class CdrFTPHandler(FTPHandler):
    """Custom FTPHandler with Cisco CUCM friendly defaults."""

    banner = "220 Cisco CUCM CDR FTP Receiver ready"


def create_ftp_server(
    host: str | None = None,
    port: int | None = None,
    user: str | None = None,
    password: str | None = None,
    home_dir: str | Path | None = None,
    pasv_min: int | None = None,
    pasv_max: int | None = None,
    masquerade_address: str | None = None,
) -> FTPServer:
    """Create and configure a pyftpdlib FTPServer instance."""
    h = host if host is not None else settings.FTP_SERVER_HOST
    p = port if port is not None else settings.FTP_SERVER_PORT
    u = user if user is not None else settings.FTP_SERVER_USER
    pwd = password if password is not None else settings.FTP_SERVER_PASSWORD
    target_dir = Path(home_dir if home_dir is not None else settings.WATCH_DIR).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    authorizer = DummyAuthorizer()
    authorizer.add_user(u, pwd, str(target_dir), perm="elradfmw")

    handler = CdrFTPHandler
    handler.authorizer = authorizer

    p_min = pasv_min if pasv_min is not None else settings.FTP_SERVER_PASV_MIN
    p_max = pasv_max if pasv_max is not None else settings.FTP_SERVER_PASV_MAX
    if p_min and p_max and p_max >= p_min:
        handler.passive_ports = range(p_min, p_max + 1)

    masq = masquerade_address if masquerade_address is not None else settings.FTP_SERVER_MASQUERADE_ADDRESS
    if masq and masq.strip():
        handler.masquerade_address = masq.strip()

    server = FTPServer((h, p), handler)
    server.max_cons = 50
    server.max_cons_per_ip = 20
    return server


def start_ftp_server(
    host: str | None = None,
    port: int | None = None,
    user: str | None = None,
    password: str | None = None,
    home_dir: str | Path | None = None,
    pasv_min: int | None = None,
    pasv_max: int | None = None,
    masquerade_address: str | None = None,
) -> FTPServer | None:
    """Start the embedded FTP server in a background daemon thread."""
    global _ftp_server_instance, _ftp_thread

    if _ftp_server_instance is not None:
        logger.warning("FTP server is already running")
        return _ftp_server_instance

    try:
        server = create_ftp_server(
            host=host,
            port=port,
            user=user,
            password=password,
            home_dir=home_dir,
            pasv_min=pasv_min,
            pasv_max=pasv_max,
            masquerade_address=masquerade_address,
        )
    except Exception as exc:
        logger.error("Failed to initialize FTP server: %s", exc)
        return None

    _ftp_server_instance = server

    def _run() -> None:
        actual_host, actual_port = server.address
        logger.info("Embedded FTP server listening on %s:%d (home=%s)", actual_host, actual_port, settings.WATCH_DIR)
        try:
            server.serve_forever(handle_exit=False)
        except Exception as e:
            logger.info("FTP server stopped: %s", e)

    _ftp_thread = threading.Thread(target=_run, name="CdrFtpServerThread", daemon=True)
    _ftp_thread.start()
    return server


def stop_ftp_server() -> None:
    """Stop the running embedded FTP server."""
    global _ftp_server_instance, _ftp_thread
    if _ftp_server_instance is not None:
        logger.info("Stopping embedded FTP server...")
        try:
            _ftp_server_instance.close_all()
        except Exception as e:
            logger.warning("Error closing FTP server: %s", e)
        _ftp_server_instance = None

    if _ftp_thread is not None and _ftp_thread.is_alive():
        _ftp_thread.join(timeout=2.0)
        _ftp_thread = None
    logger.info("Embedded FTP server stopped")
