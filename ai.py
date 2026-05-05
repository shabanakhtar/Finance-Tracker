import os
from dotenv import load_dotenv
from google import genai

from analytics import (
    detect_patterns,
    calculate_balance,
    category_summary,
    calculate_financial_score,
    analyze_budget,
    category_trends,
    spending_by_weekday,
    detect_recurring_expenses,
    detect_top_trends,
    generate_smart_warnings,
    calculate_savings_rate
)

from budget import get_budgets

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# Ai logic to analyze financial data and generate insights, patterns, and personalized advice based on the user's transaction history. 
# This will be used in the /ask-ai endpoint to provide users with intelligent responses to their financial questions.  
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
    elif ratio > 0.8:
        return "High spender"
    elif ratio > 0.5:
        return "Balanced spender"
    else:
        return "Saver"


def ask_ai(user_input, data):
    summary = calculate_balance(data)
    category_data = category_summary(data)
    insights = generate_insights(data, summary)
    personality = detect_spending_personality(summary)

    patterns = detect_patterns(data)
    patterns_text = "\n".join(patterns)

    budgets = get_budgets()
    budget_insights = analyze_budget(data, budgets)
    budget_text = "\n".join(budget_insights) if budget_insights else "No budgets set."

    score = calculate_financial_score(data)

    weekday = spending_by_weekday(data)
    recurring = detect_recurring_expenses(data)
    trends = detect_top_trends(data)
    warnings = generate_smart_warnings(data, budgets)

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
- Weekly behavior: {weekday}
- Recurring expenses: {recurring}
- Trends: {trends}

### Budget Insights
{budget_text}

### Warnings
{warnings}

### Key Insights
{chr(10).join(insights)}

### User Question
{user_input}

---

### Instructions (VERY IMPORTANT)
- Base your response ONLY on the data provided
- Identify the main financial issue clearly
- Explain WHY it is happening
- Suggest 2–3 specific actions the user can take
- If patterns exist, reference them
- Keep response clear and structured

### Response Style
- If question is simple → short answer
- If complex → structured explanation:
  1. Situation
  2. Problem
  3. Recommendation
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text
