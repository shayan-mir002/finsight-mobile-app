from datetime import date

from ..config import GROQ_API_KEY, GROQ_MODEL

SYSTEM_PROMPT = """You are FinSight, a friendly personal finance AI assistant. \
You help users understand their spending, savings and goals based ONLY on their transaction data. \
Use the context below for facts. Be concise, specific and helpful. Format numbers in Indian Rupees (Rs.). \
Never invent transactions or numbers that are not in the context."""

client = None
if GROQ_API_KEY:
    from groq import Groq

    client = Groq(api_key=GROQ_API_KEY)


async def build_context(db, user_id: str) -> str:
    txns = await db.transactions.find({"user_id": user_id}).sort("date", -1).to_list(500)
    budgets = await db.budgets.find({"user_id": user_id}).to_list(None)
    goals = await db.goals.find({"user_id": user_id}).to_list(None)

    lines = ["TRANSACTIONS (latest first):"]
    if txns:
        for t in txns:
            lines.append(
                f"- {t['date']} | {t['type']} | {t['category']} | Rs.{t['amount']} | {t.get('payment_method', '')} | {t.get('notes', '')}"
            )
    else:
        lines.append("- (no transactions yet)")

    lines.append(f"\nCURRENT MONTH: {date.today().strftime('%B %Y')}")
    if budgets:
        lines.append("BUDGETS:")
        for b in budgets:
            lines.append(f"- {b['month']} {b['category']}: limit Rs.{b['limit']}")
    if goals:
        lines.append("GOALS:")
        for g in goals:
            lines.append(
                f"- {g['name']}: Rs.{g['current_amount']} / Rs.{g['target_amount']} by {g['deadline']}"
            )
    return "\n".join(lines)


async def generate_insights(db, user_id: str) -> list[str]:
    context = await build_context(db, user_id)
    if client is None:
        return fallback_insights(context)

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.3,
            max_tokens=500,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Analyze the user's financial data and return exactly 3 short, "
                        "insightful observations. Use the exact format 'INSIGHT: <text>' "
                        "with one insight per line. Be specific with numbers where possible.\n\n"
                        + context
                    ),
                }
            ],
        )
        text = response.choices[0].message.content or ""
        insights = [
            line.split(":", 1)[1].strip()
            for line in text.splitlines()
            if line.strip().upper().startswith("INSIGHT")
        ]
        return insights[:3] or fallback_insights(context)
    except Exception:
        return fallback_insights(context)


async def answer_question(db, user_id: str, messages: list[dict]) -> str:
    context = await build_context(db, user_id)

    if client is None:
        return fallback_chat(context)

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.4,
            max_tokens=600,
            messages=[
                {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nCONTEXT:\n{context}"},
                *messages[-12:],
            ],
        )
        return response.choices[0].message.content or "I'm not sure — try asking about your spending."
    except Exception:
        return "I couldn't reach the AI service right now. Please try again in a moment."


def fallback_insights(context: str) -> list[str]:
    lines = [
        line for line in context.splitlines() if "| expense |" in line or "| income |" in line
    ]
    if not lines:
        return [
            "Add your first transactions to unlock personalized insights.",
            "Set a monthly budget to keep your spending on track.",
            "Create a savings goal and watch your progress grow.",
        ]

    totals = {"expense": 0.0, "income": 0.0}
    categories: dict[str, float] = {}
    for line in lines:
        parts = [p.strip() for p in line.split("|")]
        ttype, cat, amount = parts[1], parts[2], float(parts[3].replace("Rs.", ""))
        totals[ttype] += amount
        if ttype == "expense":
            categories[cat] = categories.get(cat, 0) + amount

    insights = []
    top = max(categories.items(), key=lambda x: x[1]) if categories else None
    if top:
        share = (top[1] / totals["expense"]) * 100 if totals["expense"] else 0
        insights.append(f"Your largest expense category is {top[0]} at Rs.{round(top[1])} ({share:.0f}% of spending).")

    if totals["expense"] and totals["income"]:
        savings = totals["income"] - totals["expense"]
        if savings < 0:
            insights.append(f"You're spending Rs.{round(-savings)} more than you earn this month.")
        elif savings == 0:
            insights.append("Your income and expenses are balanced this month.")
        else:
            insights.append(f"You saved Rs.{round(savings)} this month. Keep it up!")

    insights.append("Track daily: small expenses add up faster than you'd think.")
    return insights[:3]


def fallback_chat(context: str) -> str:
    lines = [line for line in context.splitlines() if "| expense |" in line or "| income |" in line]
    totals = {"expense": 0.0, "income": 0.0}
    categories: dict[str, float] = {}
    for line in lines:
        parts = [p.strip() for p in line.split("|")]
        ttype, cat, amount = parts[1], parts[2], float(parts[3].replace("Rs.", ""))
        totals[ttype] += amount
        if ttype == "expense":
            categories[cat] = categories.get(cat, 0) + amount

    if not lines:
        return "You don't have any transactions yet. Add your first one and I can help you analyze it!"

    top = max(categories.items(), key=lambda x: x[1]) if categories else None
    parts = []
    parts.append(f"Your total spending is Rs.{round(totals['expense'])} and income is Rs.{round(totals['income'])}.")
    if top:
        parts.append(f"You spent the most on {top[0]} (Rs.{round(top[1])}).")
    return " ".join(parts)
