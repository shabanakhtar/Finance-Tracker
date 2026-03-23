from google import genai
import os
from dotenv import load_dotenv
from analytics import detect_patterns, calculate_balance, category_summary, calculate_financial_score, analyze_budget, category_trends, spending_by_weekday, detect_recurring_expenses, detect_top_trends, generate_smart_warnings, calculate_savings_rate
from budget import get_budgets

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


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
        insights.append("Your balance is negative right now, which means you're running at a loss.")

    if summary["income"] > 0:
        ratio = summary["expense"] / summary["income"]
        if ratio > 0.8:
            insights.append("A large portion of your income is being spent, which could become risky over time.")

    if len(data) < 5:
        insights.append("There isn't much data yet, so the analysis might not be fully accurate.")

    return insights


def detect_spending_personality(summary):
    income = summary["income"]
    expense = summary["expense"]

    if income == 0:
        return "No income data available"

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

    # Behavior intelligence features
    weekday_habits = spending_by_weekday(data)
    weekday_text = "\n".join(weekday_habits) if weekday_habits else "No clear patterns by day."
    
    recurring = detect_recurring_expenses(data)
    recurring_text = "\n".join(recurring) if recurring else "No recurring expenses detected."
    
    trending = detect_top_trends(data)
    trending_text = "\n".join(trending) if trending else "Not enough data for trends."
    
    warnings = generate_smart_warnings(data, budgets)
    warnings_text = "\n".join(warnings) if warnings else "No warnings."

    # Personalized tone
    personality_tone = ""
    if personality == "Overspender":
        personality_tone = "Use a direct, corrective tone. Identify overspending and suggest cuts."
    elif personality == "High spender":
        personality_tone = "Use a balanced, guiding tone. Acknowledge spending while suggesting optimizations."
    elif personality == "Balanced spender":
        personality_tone = "Use encouraging, optimization-focused tone. Find growth opportunities."
    else:
        personality_tone = "Use positive, encouraging tone. Acknowledge good habits and suggest growth."
    
    if score < 40:
        personality_tone += " Given the low score, be serious and action-oriented."
    elif score > 75:
        personality_tone += " Given the high score, be positive and encouraging."


    prompt = f"""You're a personal finance assistant helping a student understand their finances clearly and make better decisions.

Current Situation:
- Income: {summary['income']}
- Expense: {summary['expense']}
- Balance: {summary['balance']}
- Spending Style: {personality}
- Financial Score: {score}/100

Habits & Patterns:
- Spending by day: {weekday_text}
- Recurring expenses: {recurring_text}
- Trends: {trending_text}
- Key patterns: {patterns_text if patterns_text else "None detected"}

Budget Status:
{budget_text}

Warnings:
{warnings_text}

Key Insights:
{chr(10).join(insights)}

User Question:
{user_input}

Response Style:
{personality_tone}

Guidelines:
- Base answers strictly on provided data and patterns
- Keep response clear and direct
- For simple questions, give short answers
- For complex questions, explain what's happening, main issues, and suggested actions
- Reference their specific behavior patterns
- Do NOT introduce external rules or assumptions

Format your response based on question complexity - brief for simple, detailed for broad questions.
"""

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt
    )

    return response.text
