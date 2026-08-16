from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import ai, auth, budgets, goals, transactions

app = FastAPI(title="FinSight AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])


@app.get("/health")
async def health():
    return {"status": "ok", "db": "sqlite"}
