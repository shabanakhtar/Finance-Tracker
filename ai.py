import os

from dotenv import load_dotenv
from google import genai

from analytics import (
    analyze_budget,
    calculate_balance,
    calculate_financial_score,
    detect_patterns,
    detect_recurring_expenses,
    detect_top_trends,
    generate_smart_warnings,
    spending_by_weekday,
)

load_dotenv()

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


def generate_insights(data, summary):
    insights = []

    if summary["expense"] > summary["income"]:
        insights.append("You're currently spending more than you earn.")

    category_totals = {}
    for row in data:
        if row["type"] == "expense":
            category = row["category"]
            category_totals[category] = category_totals.get(category, 0) + row["amount"]

    if category_totals:
        top_category = max(category_totals, key=category_totals.get)
        insights.append(f"Most of your money is going into {top_category}.")

    if summary["balance"] < 0:
        insights.append("Your balance is negative right now.")

    if summary["income"] > 0:
        ratio = summary["expense"] / summary["income"]
        if ratio > 0.8:
            insights.append("A large portion of your income is being spent.")

    if len(data) < 5:
        insights.append("Not enough data yet for accurate analysis.")

    return insights


def detect_spending_personality(summary):
    income = summary["income"]
    expense = summary["expense"]

    if income == 0:
        return "No income data"

    ratio = expense / income

    if ratio > 1:
        return "Overspender"
    if ratio > 0.8:
        return "High spender"
    if ratio > 0.5:
        return "Balanced spender"
    return "Saver"


def normalize_budget_limits(budgets):
    if isinstance(budgets, dict):
        return budgets

    limits = {}
    for item in budgets or []:
        category = str(item.get("category", "")).strip().lower()
        limit_amount = item.get("limit_amount")
        if category and limit_amount is not None:
            limits[category] = float(limit_amount)

    return limits


def ask_ai(user_input, data, budgets=None):
    if not client:
        raise RuntimeError("AI is not configured. Add GEMINI_API_KEY to the backend environment.")

    summary = calculate_balance(data)
    insights = generate_insights(data, summary)
    personality = detect_spending_personality(summary)

    patterns = detect_patterns(data)
    patterns_text = "\n".join(patterns) if patterns else "No strong patterns yet."

    budget_limits = normalize_budget_limits(budgets)
    budget_insights = analyze_budget(data, budget_limits)
    budget_text = "\n".join(budget_insights) if budget_insights else "No budgets set."

    score = calculate_financial_score(data)
    weekday = spending_by_weekday(data)
    recurring = detect_recurring_expenses(data)
    trends = detect_top_trends(data)
    warnings = generate_smart_warnings(data, budget_limits)

    prompt = f"""
You are a personal finance assistant helping a student improve their financial habits.

### Financial Overview
- Income: {summary['income']}
- Expense: {summary['expense']}
- Balance: {summary['balance']}
- Financial Score: {score}/100
- Spending Personality: {personality}

### Behavior & Patterns
- Spending patterns: {patterns_text}
- Weekly behavior: {weekday or "No weekly pattern detected yet."}
- Recurring expenses: {recurring or "No recurring expenses detected yet."}
- Trends: {trends or "No strong trend detected yet."}

### Budget Insights
{budget_text}

### Warnings
{warnings or "No major warnings right now."}

### Key Insights
{chr(10).join(insights)}

### User Question
{user_input}

---

### Instructions
- Base your response only on the data provided.
- Identify the main financial issue clearly.
- Explain why it is happening.
- Suggest 2-3 specific actions the user can take.
- If patterns exist, reference them.
- Keep the response clear and structured.
- Do not provide legal, tax, or investment advice.
- If there is not enough transaction data, say that clearly.

### Response Style
- If the question is simple, give a short answer.
- If the question is complex, use:
  1. Situation
  2. Problem
  3. Recommendation
"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )

    return response.text
