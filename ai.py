import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

from analytics import (
    analyze_budget,
    calculate_balance,
    calculate_financial_score,
    detect_patterns,
    detect_recurring_expenses,
    detect_top_trends,
    generate_smart_warnings,
    phase_two_opportunities,
    spending_by_weekday,
)

load_dotenv()

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_SEARCH_MODEL = os.getenv("GEMINI_SEARCH_MODEL", GEMINI_MODEL)
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


def _grounding_sources(response):
    sources = []
    seen_urls = set()

    for candidate in getattr(response, "candidates", []) or []:
        metadata = getattr(candidate, "grounding_metadata", None) or getattr(candidate, "groundingMetadata", None)
        chunks = getattr(metadata, "grounding_chunks", None) or getattr(metadata, "groundingChunks", None) or []

        for chunk in chunks:
            web = getattr(chunk, "web", None)
            if not web:
                continue

            url = getattr(web, "uri", None)
            if not url or url in seen_urls:
                continue

            sources.append({
                "title": getattr(web, "title", None) or url,
                "url": url,
            })
            seen_urls.add(url)

    return sources[:6]


def search_local_market(product_name, current_price=None, category=None, location="Pakistan"):
    if not client:
        raise RuntimeError("AI is not configured. Add GEMINI_API_KEY to the backend environment.")

    price_context = f"The user paid PKR {current_price}." if current_price else "The user has not provided the current price."
    category_context = f"Category: {category}." if category else "Category is unknown."

    prompt = f"""
You are helping a finance tracker user compare local market prices.

Product to check: {product_name}
{price_context}
{category_context}
Market: {location}

Use web search to find cheaper or better-value alternatives available to users in {location}.
Prefer sources that are likely relevant for Pakistan, such as local ecommerce stores, marketplaces, or retailer sites.

Return:
1. A short verdict on whether the current purchase looks expensive.
2. Up to 3 alternatives with product/store, approximate price, and source.
3. Estimated savings compared with the user's current price, if a price was provided.
4. A reminder that prices and stock should be verified before buying.

Rules:
- Do not invent prices, stores, or links.
- If search results are weak, say that clearly.
- Keep the answer concise and practical.
"""

    response = client.models.generate_content(
        model=GEMINI_SEARCH_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(googleSearch=types.GoogleSearch())],
        ),
    )

    return {
        "response": response.text,
        "sources": _grounding_sources(response),
    }


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
    opportunities = phase_two_opportunities(data, budget_limits)

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

### Phase 2 Opportunities
{opportunities or "No recurring, unusual spending, or value-saving opportunities detected yet."}

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
