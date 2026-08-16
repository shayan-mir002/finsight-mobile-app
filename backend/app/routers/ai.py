from fastapi import APIRouter, Depends

from ..auth import get_current_user
from ..services import ai

router = APIRouter()


@router.get("/insights")
async def insights(user: dict = Depends(get_current_user)):
    return {"insights": await ai.generate_insights(str(user["id"]))}


@router.post("/chat")
async def chat(payload: dict, user: dict = Depends(get_current_user)):
    messages = payload.get("messages", [])
    if not messages:
        return {"reply": "Ask me anything about your finances!"}

    reply = await ai.answer_question(str(user["id"]), messages)
    return {"reply": reply}
