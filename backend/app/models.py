from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

from .auth import to_public

CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
    "Education",
    "Rent",
    "Travel",
    "Other",
]

PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank", "Wallet"]


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class TransactionIn(BaseModel):
    type: Literal["expense", "income"]
    amount: float = Field(gt=0)
    category: str
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class TransactionOut(TransactionIn):
    id: str
    created_at: Optional[str] = None


class BudgetIn(BaseModel):
    category: str
    limit: float = Field(gt=0)
    month: str = Field(pattern=r"^\d{4}-\d{2}$")


class BudgetOut(BudgetIn):
    id: str


class GoalIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0, default=0)
    deadline: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class GoalOut(GoalIn):
    id: str
    created_at: Optional[str] = None


def transaction_doc(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "type": doc.get("type"),
        "amount": doc.get("amount"),
        "category": doc.get("category"),
        "date": doc.get("date"),
        "payment_method": doc.get("payment_method"),
        "notes": doc.get("notes"),
        "created_at": doc.get("created_at"),
    }


def budget_doc(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "category": doc.get("category"),
        "limit": doc.get("limit"),
        "month": doc.get("month"),
    }


def goal_doc(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "target_amount": doc.get("target_amount"),
        "current_amount": doc.get("current_amount"),
        "deadline": doc.get("deadline"),
        "created_at": doc.get("created_at"),
    }
