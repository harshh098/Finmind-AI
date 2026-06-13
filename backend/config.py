from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "FinMind AI Banking Assistant"
    environment: str = "development"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://finmind:finmind123@localhost:5432/finmind_db"
    sync_database_url: str = "postgresql://finmind:finmind123@localhost:5432/finmind_db"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # Groq LLM
    groq_api_key: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone: str = "+19895652578"
    user_mobile: str = "+919987568547"

    # RAG
    rag_dataset_path: str = "./rag/LLM_RAG_DATASET"
    embedding_model: str = "all-MiniLM-L6-v2"
    faiss_index_path: str = "./rag/faiss_index"

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
