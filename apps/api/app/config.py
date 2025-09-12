from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    DB_URL: str = Field(default="postgresql+psycopg://postgres:postgres@localhost:5433/dvapp")
    APP_ENC_KEY: str = Field(default="dev-change-me-32-bytes-min")
    OPENAI_API_KEY: str = Field(default="")
    
    # Salesforce Data Cloud
    SALESFORCE_INSTANCE_URL: str = Field(default="")
    SALESFORCE_CLIENT_ID: str = Field(default="")
    SALESFORCE_CLIENT_SECRET: str = Field(default="")
    SALESFORCE_USERNAME: str = Field(default="")
    SALESFORCE_PASSWORD: str = Field(default="")
    SALESFORCE_SECURITY_TOKEN: str = Field(default="")
    
    # Data Cloud Streaming API
    DATA_CLOUD_STREAMING_ENABLED: bool = Field(default=False)
    DATA_CLOUD_ENDPOINT: str = Field(default="")

    # Load .env from the apps/api directory regardless of current working dir
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        extra="ignore",
    )

settings = Settings()
