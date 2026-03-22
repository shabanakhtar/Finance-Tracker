from google import genai
import os
from dotenv import load_dotenv

from analytics import calculate_balance, category_summary

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def generate_insights(data, summary):
    insights = []

    # Rule 1: Overspending
    if summary["expense"] > summary["income"]:
        insights.append("You are spending more than you earn.")

    # Rule 2: Highest Spending Category
    category_totals = {}

    for row in data:
        if row["type"] == "expense":
            category = row["category"]
            category_totals[category] = category_totals.get(category, 0) + row["amount"]

    if category_totals:
        top_category = max(category_totals, key=category_totals.get)
        insights.append(f"Your highest spending category is {top_category}.")

    # Rule 3: Negative balance
    if summary["balance"] < 0:
        insights.append("Your balance is negative. You should reduce expenses immediately.")

    # Rule 4: High spending ratio warning
    if summary["income"] > 0:
        ratio = summary["expense"] / summary["income"]
        if ratio > 0.8:
            insights.append("You are spending a very high percentage of your income.")

    # Rule 5: Low activity warning
    if len(data) < 5:
        insights.append("Very few transactions recorded. Insights may not be accurate.")

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

    # ✅ MISSING LINE (CRITICAL FIX)
    personality = detect_spending_personality(summary)

    # Format category data
    category_text = "\n".join(
        [f"{k}: income={v['income']}, expense={v['expense']}" for k, v in category_data.items()]
    )

    # Format insights
    insights_text = "\n".join(insights)

    prompt = f"""
You are an intelligent personal finance advisor for a student.

Your job:
- Analyze real financial data
- Identify patterns and risks
- Give practical, specific advice

User Financial Summary:
Income: {summary['income']}
Expense: {summary['expense']}
Balance: {summary['balance']}

Spending Personality:
{personality}

Category Breakdown:
{category_text}

Detected Insights:
{insights_text}

User Question:
{user_input}

Instructions:
- Be specific to the data
- Avoid generic advice
- Explain what is happening
- Suggest 2–3 clear actions the user can take immediately

Format your answer as:
1. Analysis
2. Problems
3. Actionable Advice
"""

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt
    )

    return response.text