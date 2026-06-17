import os
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables from .env
load_dotenv()

class Settings(BaseModel):
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    PORT: int = int(os.getenv("PORT", "8000"))
    GMAIL_SENDER_ADDRESS: str = os.getenv("GMAIL_SENDER_ADDRESS", "")
    GMAIL_APP_PASSWORD: str = os.getenv("GMAIL_APP_PASSWORD", "")
    # Fernet key for encrypting stored credentials (base64-encoded 32 bytes)
    # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

settings = Settings()
