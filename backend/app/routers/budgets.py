from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..database import (
    create_budget,
    delete_budget,
    get_budget,
    get_budget_by_category,
    list_budgets,
    spent_by_category,
    update_budget,
)
from ..models import BudgetIn

router = APIRouter()


@router.get("")
async def list_budgets_route(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    user_id = str(user["id"])
    docs = await list_budgets(user_id, month)
    spent = await spent_by_category(user_id, month)

    result = []
    for doc in docs:
        item = dict(doc)
        s = spent.get(doc["category"], 0.0)
        item["spent"] = round(s, 2)
        item["remaining"] = round(max(doc["limit"] - s, 0), 2)
        item["progress"] = round(min(s / doc["limit"], 1.0), 4)
        item["over"] = s > doc["limit"]
        result.append(item)
    return result


@router.post("", status_code=201)
async def create_budget_route(payload: BudgetIn, user: dict = Depends(get_current_user)):
    user_id = str(user["id"])
    existing = await get_budget_by_category(user_id, payload.category, payload.month)
    if existing:
        raise HTTPException(409, "A budget already exists for this category and month")

    return await create_budget(user_id, payload.category, payload.limit, payload.month)


@router.put("/{budget_id}")
async def update_budget_route(
    budget_id: str, payload: BudgetIn, user: dict = Depends(get_current_user)
):
    user_id = str(user["id"])
    existing = await get_budget(user_id, budget_id)
    if existing is None:
        raise HTTPException(404, "Budget not found")

    await update_budget(user_id, budget_id, payload.model_dump())
    return await get_budget(user_id, budget_id)


@router.delete("/{budget_id}", status_code=204)
async def delete_budget_route(budget_id: str, user: dict = Depends(get_current_user)):
    deleted = await delete_budget(str(user["id"]), budget_id)
    if not deleted:
        raise HTTPException(404, "Budget not found")
