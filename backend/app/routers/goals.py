from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..database import db
from ..models import GoalIn, goal_doc

router = APIRouter()


@router.get("")
async def list_goals(user: dict = Depends(get_current_user)):
    docs = await db.goals.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(None)
    result = []
    for doc in docs:
        item = goal_doc(doc)
        item["progress"] = round(min(doc["current_amount"] / doc["target_amount"], 1.0), 4)
        item["remaining"] = round(max(doc["target_amount"] - doc["current_amount"], 0), 2)
        result.append(item)
    return result


@router.post("", status_code=201)
async def create_goal(payload: GoalIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["user_id"] = str(user["_id"])
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.goals.insert_one(doc)
    doc["_id"] = result.inserted_id
    return goal_doc(doc)


@router.put("/{goal_id}")
async def update_goal(goal_id: str, payload: GoalIn, user: dict = Depends(get_current_user)):
    existing = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": str(user["_id"])})
    if existing is None:
        raise HTTPException(404, "Goal not found")

    updates = payload.model_dump()
    await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": updates})
    existing.update(updates)
    return goal_doc(existing)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    result = await db.goals.delete_one({"_id": ObjectId(goal_id), "user_id": str(user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(404, "Goal not found")


@router.post("/{goal_id}/contribute")
async def contribute(goal_id: str, amount: float, user: dict = Depends(get_current_user)):
    if amount <= 0:
        raise HTTPException(422, "Amount must be positive")

    existing = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": str(user["_id"])})
    if existing is None:
        raise HTTPException(404, "Goal not found")

    current = existing["current_amount"] + amount
    if current > existing["target_amount"]:
        current = existing["target_amount"]

    await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": {"current_amount": current}})
    existing["current_amount"] = current
    return goal_doc(existing)
