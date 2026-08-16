import asyncio
import uuid
from typing import Optional

import aiosqlite

from .config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tx_user_cat ON transactions(user_id, category);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  "limit" REAL NOT NULL,
  month TEXT NOT NULL,
  UNIQUE(user_id, category, month)
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL,
  deadline TEXT NOT NULL,
  created_at TEXT
);
"""

_db: Optional[aiosqlite.Connection] = None
_lock = asyncio.Lock()


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        async with _lock:
            if _db is None:
                conn = await aiosqlite.connect(DB_PATH)
                conn.row_factory = aiosqlite.Row
                await conn.executescript(SCHEMA)
                await conn.commit()
                _db = conn
    return _db


async def close() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Users ----------

def _user_row(r: aiosqlite.Row) -> dict:
    return {
        "id": r["id"],
        "name": r["name"],
        "email": r["email"],
        "password_hash": r["password_hash"],
        "avatar": r["avatar"],
        "created_at": r["created_at"],
    }


async def get_user_by_id(user_id: str) -> Optional[dict]:
    cur = await (await get_db()).execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = await cur.fetchone()
    return _user_row(row) if row else None


async def get_user_by_email(email: str) -> Optional[dict]:
    cur = await (await get_db()).execute("SELECT * FROM users WHERE email = ?", (email,))
    row = await cur.fetchone()
    return _user_row(row) if row else None


async def create_user(name: str, email: str, password_hash: str, created_at: str) -> dict:
    user_id = new_id()
    db = await get_db()
    await db.execute(
        "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, name, email, password_hash, created_at),
    )
    await db.commit()
    return _user_row(
        await _fetch("SELECT * FROM users WHERE id = ?", (user_id,))
    )


async def update_user_avatar(user_id: str, avatar: str) -> Optional[dict]:
    db = await get_db()
    await db.execute("UPDATE users SET avatar = ? WHERE id = ?", (avatar, user_id))
    await db.commit()
    return await get_user_by_id(user_id)


async def _fetch(sql: str, params: tuple = ()) -> Optional[aiosqlite.Row]:
    cur = await (await get_db()).execute(sql, params)
    return await cur.fetchone()


# ---------- Transactions ----------

def _txn_row(r: aiosqlite.Row) -> dict:
    return {
        "id": r["id"],
        "type": r["type"],
        "amount": r["amount"],
        "category": r["category"],
        "date": r["date"],
        "payment_method": r["payment_method"],
        "notes": r["notes"],
        "created_at": r["created_at"],
    }


async def list_transactions(
    user_id: str,
    type: Optional[str] = None,
    category: Optional[str] = None,
    month: Optional[str] = None,
    limit: int = 500,
) -> list[dict]:
    where = ["user_id = ?"]
    params: list = [user_id]
    if type:
        where.append("type = ?")
        params.append(type)
    if category:
        where.append("category = ?")
        params.append(category)
    if month:
        where.append("substr(date, 1, 7) = ?")
        params.append(month)
    cur = await (await get_db()).execute(
        f"SELECT * FROM transactions WHERE {' AND '.join(where)} "
        f"ORDER BY date DESC, created_at DESC LIMIT {limit}",
        params,
    )
    return [_txn_row(r) for r in await cur.fetchall()]


async def get_transaction(user_id: str, txn_id: str) -> Optional[dict]:
    row = await _fetch(
        "SELECT * FROM transactions WHERE id = ? AND user_id = ?", (txn_id, user_id)
    )
    return _txn_row(row) if row else None


async def create_transaction(user_id: str, data: dict) -> dict:
    txn_id = new_id()
    db = await get_db()
    await db.execute(
        "INSERT INTO transactions (id, user_id, type, amount, category, date, payment_method, notes, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            txn_id,
            user_id,
            data["type"],
            data["amount"],
            data["category"],
            data["date"],
            data.get("payment_method"),
            data.get("notes"),
            data.get("created_at"),
        ),
    )
    await db.commit()
    return await get_transaction(user_id, txn_id)


async def update_transaction(user_id: str, txn_id: str, updates: dict) -> bool:
    fields = ["type", "amount", "category", "date", "payment_method", "notes"]
    sets = [f"{f} = ?" for f in fields if f in updates]
    if not sets:
        return (await get_transaction(user_id, txn_id)) is not None
    params = [updates[f] for f in fields if f in updates]
    params += [txn_id, user_id]
    db = await get_db()
    cur = await db.execute(
        f"UPDATE transactions SET {', '.join(sets)} WHERE id = ? AND user_id = ?",
        params,
    )
    await db.commit()
    return cur.rowcount > 0


async def delete_transaction(user_id: str, txn_id: str) -> bool:
    db = await get_db()
    cur = await db.execute(
        "DELETE FROM transactions WHERE id = ? AND user_id = ?", (txn_id, user_id)
    )
    await db.commit()
    return cur.rowcount > 0


# ---------- Budgets ----------

def _budget_row(r: aiosqlite.Row) -> dict:
    return {
        "id": r["id"],
        "category": r["category"],
        "limit": r["limit"],
        "month": r["month"],
    }


async def list_budgets(user_id: str, month: str) -> list[dict]:
    cur = await (await get_db()).execute(
        "SELECT * FROM budgets WHERE user_id = ? AND month = ? ORDER BY category",
        (user_id, month),
    )
    return [_budget_row(r) for r in await cur.fetchall()]


async def list_all_budgets(user_id: str) -> list[dict]:
    cur = await (await get_db()).execute(
        "SELECT * FROM budgets WHERE user_id = ?", (user_id,)
    )
    return [_budget_row(r) for r in await cur.fetchall()]


async def get_budget_by_category(user_id: str, category: str, month: str) -> Optional[dict]:
    row = await _fetch(
        "SELECT * FROM budgets WHERE user_id = ? AND category = ? AND month = ?",
        (user_id, category, month),
    )
    return _budget_row(row) if row else None


async def get_budget(user_id: str, budget_id: str) -> Optional[dict]:
    row = await _fetch(
        "SELECT * FROM budgets WHERE id = ? AND user_id = ?", (budget_id, user_id)
    )
    return _budget_row(row) if row else None


async def create_budget(user_id: str, category: str, limit: float, month: str) -> dict:
    budget_id = new_id()
    db = await get_db()
    await db.execute(
        'INSERT INTO budgets (id, user_id, category, "limit", month) VALUES (?, ?, ?, ?, ?)',
        (budget_id, user_id, category, limit, month),
    )
    await db.commit()
    return await get_budget(user_id, budget_id)


async def update_budget(user_id: str, budget_id: str, updates: dict) -> bool:
    fields = ['"category"', '"limit"', '"month"']
    sets = [f"{f} = ?" for f in fields if f.strip('"') in updates]
    if not sets:
        return (await get_budget(user_id, budget_id)) is not None
    params = [updates[f.strip('"')] for f in fields if f.strip('"') in updates]
    params += [budget_id, user_id]
    db = await get_db()
    cur = await db.execute(
        f"UPDATE budgets SET {', '.join(sets)} WHERE id = ? AND user_id = ?",
        params,
    )
    await db.commit()
    return cur.rowcount > 0


async def delete_budget(user_id: str, budget_id: str) -> bool:
    db = await get_db()
    cur = await db.execute(
        "DELETE FROM budgets WHERE id = ? AND user_id = ?", (budget_id, user_id)
    )
    await db.commit()
    return cur.rowcount > 0


async def spent_by_category(user_id: str, month: str) -> dict[str, float]:
    cur = await (await get_db()).execute(
        "SELECT category, SUM(amount) AS spent FROM transactions "
        "WHERE user_id = ? AND type = 'expense' AND substr(date, 1, 7) = ? "
        "GROUP BY category",
        (user_id, month),
    )
    return {r["category"]: r["spent"] for r in await cur.fetchall()}


# ---------- Goals ----------

def _goal_row(r: aiosqlite.Row) -> dict:
    return {
        "id": r["id"],
        "name": r["name"],
        "target_amount": r["target_amount"],
        "current_amount": r["current_amount"],
        "deadline": r["deadline"],
        "created_at": r["created_at"],
    }


async def list_goals(user_id: str) -> list[dict]:
    cur = await (await get_db()).execute(
        "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
    )
    return [_goal_row(r) for r in await cur.fetchall()]


async def get_goal(user_id: str, goal_id: str) -> Optional[dict]:
    row = await _fetch(
        "SELECT * FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id)
    )
    return _goal_row(row) if row else None


async def create_goal(user_id: str, data: dict) -> dict:
    goal_id = new_id()
    db = await get_db()
    await db.execute(
        "INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            goal_id,
            user_id,
            data["name"],
            data["target_amount"],
            data["current_amount"],
            data["deadline"],
            data.get("created_at"),
        ),
    )
    await db.commit()
    return await get_goal(user_id, goal_id)


async def update_goal(user_id: str, goal_id: str, updates: dict) -> bool:
    sets = [f"{f} = ?" for f in ("name", "target_amount", "current_amount", "deadline") if f in updates]
    if not sets:
        return (await get_goal(user_id, goal_id)) is not None
    params = [updates[f] for f in ("name", "target_amount", "current_amount", "deadline") if f in updates]
    params += [goal_id, user_id]
    db = await get_db()
    cur = await db.execute(
        f"UPDATE goals SET {', '.join(sets)} WHERE id = ? AND user_id = ?",
        params,
    )
    await db.commit()
    return cur.rowcount > 0


async def set_goal_current(user_id: str, goal_id: str, current_amount: float) -> Optional[dict]:
    db = await get_db()
    cur = await db.execute(
        "UPDATE goals SET current_amount = ? WHERE id = ? AND user_id = ?",
        (current_amount, goal_id, user_id),
    )
    await db.commit()
    return await get_goal(user_id, goal_id)


async def delete_goal(user_id: str, goal_id: str) -> bool:
    db = await get_db()
    cur = await db.execute(
        "DELETE FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id)
    )
    await db.commit()
    return cur.rowcount > 0
