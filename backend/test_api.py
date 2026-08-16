import os
import shutil
import tempfile

os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["JWT_SECRET"] = "test-secret"
os.environ["GROQ_API_KEY"] = ""

from fastapi.testclient import TestClient  # noqa: E402


def main():
    from app.main import app

    c = TestClient(app)
    ok = 0

    r = c.get("/health")
    assert r.status_code == 200, r.text
    assert r.json()["db"] == "sqlite"
    ok += 1
    print("health OK")

    r = c.post("/api/auth/register", json={"name": "Test User", "email": "test@example.com", "password": "secret123"})
    assert r.status_code == 201, r.text
    data = r.json()
    token = data["token"]
    headers = {"Authorization": f"Bearer {token}"}
    ok += 1
    print("register OK")

    r = c.post("/api/auth/login", json={"email": "test@example.com", "password": "secret123"})
    assert r.status_code == 200, r.text
    ok += 1
    print("login OK")

    r = c.post("/api/auth/login", json={"email": "test@example.com", "password": "wrong"})
    assert r.status_code == 401
    ok += 1
    print("bad login rejected OK")

    r = c.post("/api/auth/avatar", json={"avatar": "data:image/png;base64,AAAA"}, headers=headers)
    assert r.status_code == 200 and r.json()["avatar"] == "data:image/png;base64,AAAA", r.text
    ok += 1
    print("avatar OK")

    r = c.get("/api/transactions/summary?month=2026-08", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["monthly_expense"] == 0
    ok += 1
    print("empty summary OK")

    txns = [
        {"type": "income", "amount": 50000, "category": "Salary", "date": "2026-08-01", "payment_method": "Bank"},
        {"type": "expense", "amount": 12000, "category": "Food", "date": "2026-08-03", "payment_method": "UPI"},
        {"type": "expense", "amount": 4000, "category": "Transport", "date": "2026-08-05", "payment_method": "Card"},
        {"type": "expense", "amount": 3000, "category": "Food", "date": "2026-08-10", "payment_method": "UPI"},
        {"type": "expense", "amount": 2000, "category": "Food", "date": "2026-07-20", "payment_method": "Cash"},
    ]
    ids = []
    for t in txns:
        r = c.post("/api/transactions", json=t, headers=headers)
        assert r.status_code == 201, r.text
        ids.append(r.json()["id"])
    ok += 1
    print("create transactions OK")

    r = c.get("/api/transactions?month=2026-08", headers=headers)
    assert r.status_code == 200 and len(r.json()) == 4
    ok += 1
    print("list by month OK")

    r = c.get("/api/transactions/summary?month=2026-08", headers=headers)
    s = r.json()
    assert s["monthly_income"] == 50000, s
    assert s["monthly_expense"] == 19000, s
    assert s["monthly_savings"] == 31000, s
    assert s["balance"] == 29000, s
    assert s["breakdown"][0]["category"] == "Food", s
    ok += 1
    print("summary OK:", s)

    r = c.get("/api/transactions/history", headers=headers)
    assert r.status_code == 200 and len(r.json()) == 2
    ok += 1
    print("history OK")

    r = c.put(f"/api/transactions/{ids[1]}", json={"type": "expense", "amount": 100, "category": "Food", "date": "2026-08-03", "payment_method": "UPI"}, headers=headers)
    assert r.status_code == 200 and r.json()["amount"] == 100
    ok += 1
    print("update transaction OK")

    r = c.delete(f"/api/transactions/{ids[1]}", headers=headers)
    assert r.status_code == 204
    ok += 1
    print("delete transaction OK")

    r = c.post("/api/budgets", json={"category": "Food", "limit": 10000, "month": "2026-08"}, headers=headers)
    assert r.status_code == 201, r.text
    ok += 1
    r = c.get("/api/budgets?month=2026-08", headers=headers)
    budgets = r.json()
    assert budgets[0]["spent"] == 3000 and budgets[0]["over"] is False and budgets[0]["remaining"] == 7000, budgets
    ok += 1
    print("budgets with spend OK:", budgets[0])

    r = c.post("/api/goals", json={"name": "New Bike", "target_amount": 100000, "current_amount": 20000, "deadline": "2026-12-31"}, headers=headers)
    assert r.status_code == 201, r.text
    gid = r.json()["id"]
    ok += 1
    r = c.post(f"/api/goals/{gid}/contribute?amount=5000", headers=headers)
    assert r.status_code == 200 and r.json()["current_amount"] == 25000
    ok += 1
    r = c.get("/api/goals", headers=headers)
    assert r.json()[0]["progress"] == 0.25 and r.json()[0]["remaining"] == 75000
    ok += 1
    print("goals OK")

    r = c.get("/api/ai/insights", headers=headers)
    assert r.status_code == 200 and len(r.json()["insights"]) == 3, r.text
    ok += 1
    print("insights OK:", r.json()["insights"])

    r = c.post("/api/ai/chat", json={"messages": [{"role": "user", "content": "Where did I spend the most?"}]}, headers=headers)
    assert r.status_code == 200 and r.json()["reply"]
    ok += 1
    print("chat OK:", r.json()["reply"][:80])

    r = c.get("/api/transactions", headers=headers)
    assert r.status_code == 200
    ok += 1
    print("auth OK")

    r = c.get("/api/transactions")
    assert r.status_code == 401
    ok += 1
    print("auth guard OK")

    print(f"\nALL {ok} TESTS PASSED")


if __name__ == "__main__":
    main()
