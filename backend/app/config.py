import os

from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "finsight.db")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGO = "HS256"
JWT_EXPIRE_DAYS = 30

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
