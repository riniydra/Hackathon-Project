from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    DB_URL: str = Field(default="postgresql+psycopg://postgres:postgres@localhost:5433/dvapp")
    APP_ENC_KEY: str = Field(default="dev-change-me-32-bytes-min")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
