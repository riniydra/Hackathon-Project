from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    DB_URL: str = Field(default="postgresql+psycopg://postgres:postgres@localhost:5433/dvapp")
    APP_ENC_KEY: str = Field(default="dev-change-me-32-bytes-min")
    OPENAI_API_KEY: str = Field(default="")

    # Load .env from the apps/api directory regardless of current working dir
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        extra="ignore",
    )

settings = Settings()
