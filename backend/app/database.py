from motor.motor_asyncio import AsyncIOMotorClient

from .config import MONGO_DB, MONGO_URI

client = AsyncIOMotorClient(MONGO_URI)
db = client[MONGO_DB]
