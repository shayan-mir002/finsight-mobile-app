from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..database import db
from ..models import BudgetIn, budget_doc

router = APIRouter()


@router.get("")
async def list_budgets(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    user_id = str(user["_id"])
    docs = await db.budgets.find({"user_id": user_id, "month": month}).to_list(None)

    spent_by_category = await _spent_by_category(user_id, month)

    result = []
    for doc in docs:
        item = budget_doc(doc)
        spent = spent_by_category.get(doc["category"], 0.0)
        item["spent"] = round(spent, 2)
        item["remaining"] = round(max(doc["limit"] - spent, 0), 2)
        item["progress"] = round(min(spent / doc["limit"], 1.0), 4)
        item["over"] = spent > doc["limit"]
        result.append(item)
    return result


@router.post("", status_code=201)
async def create_budget(payload: BudgetIn, user: dict = Depends(get_current_user)):
    existing = await db.budgets.find_one(
        {"user_id": str(user["_id"]), "category": payload.category, "month": payload.month}
    )
    if existing:
        raise HTTPException(409, "A budget already exists for this category and month")

    doc = payload.model_dump()
    doc["user_id"] = str(user["_id"])
    result = await db.budgets.insert_one(doc)
    doc["_id"] = result.inserted_id
    return budget_doc(doc)


@router.put("/{budget_id}")
async def update_budget(
    budget_id: str, payload: BudgetIn, user: dict = Depends(get_current_user)
):
    existing = await db.budgets.find_one({"_id": ObjectId(budget_id), "user_id": str(user["_id"])})
    if existing is None:
        raise HTTPException(404, "Budget not found")

    updates = payload.model_dump()
    await db.budgets.update_one({"_id": ObjectId(budget_id)}, {"$set": updates})
    existing.update(updates)
    return budget_doc(existing)


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(budget_id: str, user: dict = Depends(get_current_user)):
    result = await db.budgets.delete_one({"_id": ObjectId(budget_id), "user_id": str(user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(404, "Budget not found")


async def _spent_by_category(user_id: str, month: str) -> dict:
    pipeline = [
        {"$match": {"user_id": user_id, "type": "expense", "date": {"$gte": f"{month}-01", "$lte": f"{month}-31"}}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
    ]
    result = await db.transactions.aggregate(pipeline).to_list(None)
    return {doc["_id"]: doc["total"] for doc in result}
