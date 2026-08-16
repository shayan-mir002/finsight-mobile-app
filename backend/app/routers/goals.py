from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..database import (
    create_goal,
    delete_goal,
    get_goal,
    list_goals,
    set_goal_current,
    update_goal,
)
from ..models import GoalIn

router = APIRouter()


@router.get("")
async def list_goals_route(user: dict = Depends(get_current_user)):
    user_id = str(user["id"])
    result = []
    for doc in await list_goals(user_id):
        item = dict(doc)
        item["progress"] = round(min(doc["current_amount"] / doc["target_amount"], 1.0), 4)
        item["remaining"] = round(max(doc["target_amount"] - doc["current_amount"], 0), 2)
        result.append(item)
    return result


@router.post("", status_code=201)
async def create_goal_route(payload: GoalIn, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    return await create_goal(str(user["id"]), data)


@router.put("/{goal_id}")
async def update_goal_route(
    goal_id: str, payload: GoalIn, user: dict = Depends(get_current_user)
):
    user_id = str(user["id"])
    existing = await get_goal(user_id, goal_id)
    if existing is None:
        raise HTTPException(404, "Goal not found")

    await update_goal(user_id, goal_id, payload.model_dump())
    return await get_goal(user_id, goal_id)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal_route(goal_id: str, user: dict = Depends(get_current_user)):
    deleted = await delete_goal(str(user["id"]), goal_id)
    if not deleted:
        raise HTTPException(404, "Goal not found")


@router.post("/{goal_id}/contribute")
async def contribute(goal_id: str, amount: float, user: dict = Depends(get_current_user)):
    if amount <= 0:
        raise HTTPException(422, "Amount must be positive")

    user_id = str(user["id"])
    existing = await get_goal(user_id, goal_id)
    if existing is None:
        raise HTTPException(404, "Goal not found")

    current = existing["current_amount"] + amount
    if current > existing["target_amount"]:
        current = existing["target_amount"]

    updated = await set_goal_current(user_id, goal_id, current)
    return updated
