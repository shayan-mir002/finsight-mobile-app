from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..database import db
from ..models import TransactionIn, transaction_doc

router = APIRouter()

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


@router.get("")
async def list_transactions(
    type: Optional[str] = None,
    category: Optional[str] = None,
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    query: dict = {"user_id": str(user["_id"])}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if month:
        query["date"] = {"$gte": f"{month}-01", "$lte": f"{month}-31"}

    docs = await db.transactions.find(query).sort("date", -1).to_list(500)
    return [transaction_doc(doc) for doc in docs]


@router.post("", status_code=201)
async def create_transaction(payload: TransactionIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["user_id"] = str(user["_id"])
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.transactions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return transaction_doc(doc)


@router.put("/{txn_id}")
async def update_transaction(
    txn_id: str, payload: TransactionIn, user: dict = Depends(get_current_user)
):
    existing = await db.transactions.find_one({"_id": ObjectId(txn_id), "user_id": str(user["_id"])})
    if existing is None:
        raise HTTPException(404, "Transaction not found")

    updates = payload.model_dump()
    await db.transactions.update_one({"_id": ObjectId(txn_id)}, {"$set": updates})
    existing.update(updates)
    return transaction_doc(existing)


@router.delete("/{txn_id}", status_code=204)
async def delete_transaction(txn_id: str, user: dict = Depends(get_current_user)):
    result = await db.transactions.delete_one({"_id": ObjectId(txn_id), "user_id": str(user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(404, "Transaction not found")


@router.get("/summary")
async def summary(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    user_id = str(user["_id"])
    month_range = {"$gte": f"{month}-01", "$lte": f"{month}-31"}

    monthly = await db.transactions.find(
        {"user_id": user_id, "date": month_range}
    ).to_list(None)

    all_time = await db.transactions.find({"user_id": user_id}).to_list(None)

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
            {"category": cat, "amount": round(amt, 2)} for cat, amt in sorted(breakdown.items(), key=lambda x: -x[1])
        ],
    }


@router.get("/history")
async def history(user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    all_txns = await db.transactions.find({"user_id": user_id}).to_list(None)

    by_month: dict[str, dict] = {}
    for t in all_txns:
        key = t["date"][:7]
        bucket = by_month.setdefault(key, {"income": 0.0, "expense": 0.0})
        bucket[t["type"]] += t["amount"]

    return [
        {"month": key, "label": f"{MONTHS[int(key[5:7]) - 1]} {key[:4]}", "income": round(v["income"], 2), "expense": round(v["expense"], 2)}
        for key, v in sorted(by_month.items())
    ][-6:]
