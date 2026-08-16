from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..database import (
    create_transaction,
    delete_transaction,
    get_transaction,
    list_transactions,
    update_transaction,
)
from ..models import TransactionIn

router = APIRouter()

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


@router.get("")
async def list_transactions_route(
    type: Optional[str] = None,
    category: Optional[str] = None,
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    return await list_transactions(
        str(user["id"]), type=type, category=category, month=month
    )


@router.post("", status_code=201)
async def create_transaction_route(payload: TransactionIn, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    return await create_transaction(str(user["id"]), data)


@router.put("/{txn_id}")
async def update_transaction_route(
    txn_id: str, payload: TransactionIn, user: dict = Depends(get_current_user)
):
    existing = await get_transaction(str(user["id"]), txn_id)
    if existing is None:
        raise HTTPException(404, "Transaction not found")

    await update_transaction(str(user["id"]), txn_id, payload.model_dump())
    return await get_transaction(str(user["id"]), txn_id)


@router.delete("/{txn_id}", status_code=204)
async def delete_transaction_route(txn_id: str, user: dict = Depends(get_current_user)):
    deleted = await delete_transaction(str(user["id"]), txn_id)
    if not deleted:
        raise HTTPException(404, "Transaction not found")


@router.get("/summary")
async def summary(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    user_id = str(user["id"])
    monthly = await list_transactions(user_id, month=month)
    all_time = await list_transactions(user_id)

    income = sum(t["amount"] for t in monthly if t["type"] == "income")
    expense = sum(t["amount"] for t in monthly if t["type"] == "expense")
    total_income = sum(t["amount"] for t in all_time if t["type"] == "income")
    total_expense = sum(t["amount"] for t in all_time if t["type"] == "expense")

    breakdown: dict[str, float] = {}
    for t in monthly:
        if t["type"] == "expense":
            breakdown[t["category"]] = breakdown.get(t["category"], 0) + t["amount"]

    return {
        "month": month,
        "monthly_income": round(income, 2),
        "monthly_expense": round(expense, 2),
        "monthly_savings": round(income - expense, 2),
        "balance": round(total_income - total_expense, 2),
        "breakdown": [
            {"category": cat, "amount": round(amt, 2)}
            for cat, amt in sorted(breakdown.items(), key=lambda x: -x[1])
        ],
    }


@router.get("/history")
async def history(user: dict = Depends(get_current_user)):
    user_id = str(user["id"])
    all_txns = await list_transactions(user_id)

    by_month: dict[str, dict] = {}
    for t in all_txns:
        key = t["date"][:7]
        bucket = by_month.setdefault(key, {"income": 0.0, "expense": 0.0})
        bucket[t["type"]] += t["amount"]

    return [
        {
            "month": key,
            "label": f"{MONTHS[int(key[5:7]) - 1]} {key[:4]}",
            "income": round(v["income"], 2),
            "expense": round(v["expense"], 2),
        }
        for key, v in sorted(by_month.items())
    ][-6:]
