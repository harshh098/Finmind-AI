from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    app_name: str = "FinMind AI Banking Assistant"
    environment: str = "development"
    debug: bool = True

    database_url: str = "postgresql+asyncpg://finmind:finmind123@localhost:5432/finmind_db"
    sync_database_url: str = "postgresql://finmind:finmind123@localhost:5432/finmind_db"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    groq_api_key: str = ""

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone: str = "+19895652578"
    user_mobile: str = "+919987568547"

    rag_dataset_path: str = "./rag/LLM_RAG_DATASET"
    embedding_model: str = "all-MiniLM-L6-v2"
    faiss_index_path: str = "./rag/faiss_index"

    allowed_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        db = os.environ.get("DATABASE_URL", "")
        if db:
            if db.startswith("postgresql://"):
                object.__setattr__(self, "sync_database_url", db)
                object.__setattr__(self, "database_url", db.replace("postgresql://", "postgresql+asyncpg://", 1))
            elif db.startswith("postgresql+asyncpg://"):
                object.__setattr__(self, "database_url", db)
                object.__setattr__(self, "sync_database_url", db.replace("postgresql+asyncpg://", "postgresql://", 1))

    class Config:
        env_file = ".env"
        case_sensitive = False


def get_settings() -> Settings:
    return Settings()


settings = Settings()