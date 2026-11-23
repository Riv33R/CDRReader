from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Cisco CDR Reader"
    DATABASE_URL: str = "postgresql+asyncpg://cdrreader:cdrreader_secret_change_me@localhost:5432/cdrreader"

    # Analytics & Ingestion Toggles
    ENABLE_CDR_ANALYTICS: bool = Field(
        default=True,
        validation_alias=AliasChoices("ENABLE_CDR_ANALYTICS", "CDR_ANALYTICS_ENABLED", "ENABLE_CDR"),
    )
    ENABLE_CMR_ANALYTICS: bool = Field(
        default=True,
        validation_alias=AliasChoices("ENABLE_CMR_ANALYTICS", "CMR_ANALYTICS_ENABLED", "ENABLE_CMR"),
    )

    # Watch-dir configuration
    WATCH_DIR_ENABLED: bool = True
    WATCH_DIR: str = "/data/cdr_inbox"
    ARCHIVE_DIR: str = "/data/cdr_archive"
    ERROR_DIR: str = "/data/cdr_error"
    WATCH_POLL_INTERVAL: int = 15

    # Optional external SFTP poller configuration
    SFTP_POLLER_ENABLED: bool = False
    SFTP_HOST: str = ""
    SFTP_PORT: int = 22
    SFTP_USER: str = ""
    SFTP_PASSWORD: str = ""
    SFTP_REMOTE_DIR: str = "/cdr"
    SFTP_POLL_INTERVAL: int = 60

    # Embedded FTP Server configuration (incoming receiver for Cisco CUCM Billing Server)
    FTP_SERVER_ENABLED: bool = False
    FTP_SERVER_HOST: str = "0.0.0.0"
    FTP_SERVER_PORT: int = 21
    FTP_SERVER_USER: str = "cucm_ftp"
    FTP_SERVER_PASSWORD: str = "cucm_secret_change_me"
    FTP_SERVER_PASV_MIN: int = 21100
    FTP_SERVER_PASV_MAX: int = 21110
    FTP_SERVER_MASQUERADE_ADDRESS: str = ""

    # Call direction classification (digits <= this length are treated as internal extensions)
    INTERNAL_NUMBER_MAX_LEN: int = 6

    CORS_ORIGINS: list[str] = ["*"]


settings = Settings()
