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
    # JWT Bearer OAuth (preferred for server-to-server)
    SALESFORCE_JWT_CLIENT_ID: str = Field(default="")  # Connected App Consumer Key
    SALESFORCE_JWT_USERNAME: str = Field(default="")   # Integration User username (sub)
    SALESFORCE_JWT_AUDIENCE: str = Field(default="https://login.salesforce.com")  # or https://test.salesforce.com
    SALESFORCE_JWT_PRIVATE_KEY_B64: str = Field(default="")  # Base64-encoded PEM private key
    
    # Data Cloud Streaming API
    DATA_CLOUD_STREAMING_ENABLED: bool = Field(default=False)
    DATA_CLOUD_ENDPOINT: str = Field(default="")
    # Optional: dataset-specific full URLs (override default endpoint/path)
    DATA_CLOUD_CHAT_EVENTS_URL: str = Field(default="")
    DATA_CLOUD_RISK_SNAPSHOTS_URL: str = Field(default="")

    # Load .env from the apps/api directory regardless of current working dir
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        extra="ignore",
    )

settings = Settings()
