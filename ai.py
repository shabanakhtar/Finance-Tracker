from google import genai
import os
from dotenv import load_dotenv
from analytics import detect_patterns, calculate_balance, category_summary, calculate_financial_score, analyze_budget, category_trends
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

    trends = category_trends(data)
    trends_text = "\n".join(trends) if trends else "Not enough data for category trends."

    category_text = "\n".join(
        [f"{k}: income={v['income']}, expense={v['expense']}" for k, v in category_data.items()]
    )

    insights_text = "\n".join(insights)

    prompt = f"""
You're a personal finance assistant helping a student understand their finances clearly and practically.

Here is their current situation:

Income: {summary['income']}
Expense: {summary['expense']}
Balance: {summary['balance']}

Spending Style:
{personality}

Category Breakdown:
{category_text}

Key Insights:
{insights_text}

Spending Patterns:
{patterns_text}

Category Trends:
{trends_text}

Financial Health Score:
{score}/100

Budget Status:
{budget_text}

User Question:
{user_input}

Your task:
- Explain what’s going on in simple, clear terms
- Identify any problems or risks
- Suggest practical steps the user can take

Guidelines:
- Base your response strictly on the provided data, insights, patterns, trends, budget status, and financial score
- Use the financial score to judge overall financial health
- Highlight overspending using the budget information and suggest specific corrections
- Do NOT introduce external rules, benchmarks, or assumptions
- If something is not supported by the data, do not mention it
- Keep the response clear, direct, and helpful

Response Style:
- Adjust the length based on the question:
  • If the question is simple → give a short, direct answer
  • If the question is broad → give a more detailed explanation
- Match your tone to the financial score:
  • Low score → more serious and corrective
  • Medium score → balanced and guiding
  • High score → positive and encouraging

Structure:
- If detailed response is needed:
  1. What’s happening
  2. Main issues
  3. What to do next
- Otherwise:
  Give a concise and focused answer
"""

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt
    )

    return response.text
