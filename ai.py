from google import genai
import os
from dotenv import load_dotenv

from analytics import calculate_balance, category_summary

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

    category_text = "\n".join(
        [f"{k}: income={v['income']}, expense={v['expense']}" for k, v in category_data.items()]
    )

    insights_text = "\n".join(insights)

    prompt = f"""
You're a personal finance guide helping a student understand their money better.

Here’s their current situation:

Income: {summary['income']}
Expense: {summary['expense']}
Balance: {summary['balance']}

Spending style:
{personality}

Where their money is going:
{category_text}

What stands out:
{insights_text}

Their question:
{user_input}

Explain what's going on in simple terms, point out any problems, and give a few practical steps they can start with right away.
Keep it clear, specific, and helpful.
"""

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt
    )

    return response.text
