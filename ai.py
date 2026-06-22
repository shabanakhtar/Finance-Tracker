import base64
import binascii
import json
import os
from datetime import date, datetime

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


def _extract_json_object(text):
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found.")

    return json.loads(cleaned[start:end + 1])


def _number_or_none(value):
    if value in [None, ""]:
        return None

    try:
        return float(str(value).replace(",", "").replace("PKR", "").replace("Rs.", "").replace("Rs", "").strip())
    except ValueError:
        return None


def _valid_date_or_today(value):
    cleaned = str(value or "").strip()
    try:
        datetime.strptime(cleaned, "%Y-%m-%d")
        return cleaned
    except ValueError:
        return date.today().isoformat()


def _clamp_confidence(value):
    try:
        return max(0, min(float(value), 1))
    except (TypeError, ValueError):
        return 0


def _normalize_receipt_items(items):
    normalized = []

    for item in items or []:
        if not isinstance(item, dict):
            continue

        name = str(item.get("name") or "").strip()
        price = _number_or_none(item.get("price"))

        if not name:
            continue

        normalized.append({
            "name": name[:120],
            "price": round(price, 2) if price and price > 0 else None,
        })

    return normalized[:12]


def _normalize_alternatives(items, current_price=None):
    normalized = []
    seen = set()

    for item in items or []:
        if not isinstance(item, dict):
            continue

        name = str(item.get("name") or item.get("product") or "").strip()
        store = str(item.get("store") or item.get("seller") or "Unknown store").strip()
        url = str(item.get("url") or item.get("source_url") or "").strip()
        price = _number_or_none(item.get("price"))
        confidence = str(item.get("confidence") or "low").strip().lower()

        if not name or not url or price is None or price <= 0:
            continue

        if confidence not in ["low", "medium", "high"]:
            confidence = "low"

        key = (name.lower(), store.lower(), url.lower())
        if key in seen:
            continue

        savings = None
        savings_percent = None
        if current_price and price < current_price:
            savings = round(current_price - price, 2)
            savings_percent = round((savings / current_price) * 100, 1)
        elif current_price:
            continue

        normalized.append({
            "name": name[:140],
            "store": store[:80],
            "price": round(price, 2),
            "url": url,
            "savings": savings,
            "savings_percent": savings_percent,
            "confidence": confidence,
            "reason": str(item.get("reason") or "Possible lower-cost option.").strip()[:220],
        })
        seen.add(key)

    normalized.sort(key=lambda item: (item["savings"] is None, -(item["savings"] or 0), item["price"]))
    return normalized[:3]


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

Return JSON only with this exact shape:
{{
  "verdict": "short practical verdict",
  "alternatives": [
    {{
      "name": "product name",
      "store": "seller or store",
      "price": number,
      "url": "source URL",
      "confidence": "low" | "medium" | "high",
      "reason": "why this is relevant"
    }}
  ],
  "warnings": ["short warning"]
}}

Rules:
- Do not invent prices, stores, or links.
- Every alternative must include a URL and numeric price found from search.
- If the user provided a price, only include alternatives that appear cheaper.
- If search results are weak, say that clearly.
- Keep the answer concise and practical.
- Always include a warning to verify price, stock, and seller before buying.
"""

    response = client.models.generate_content(
        model=GEMINI_SEARCH_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(googleSearch=types.GoogleSearch())],
        ),
    )

    sources = _grounding_sources(response)

    try:
        parsed = _extract_json_object(response.text)
    except (json.JSONDecodeError, ValueError):
        return {
            "response": response.text,
            "verdict": "I found market information, but could not safely structure the results.",
            "alternatives": [],
            "warnings": ["Verify price, stock, and seller before buying."],
            "sources": sources,
        }

    current_price_number = _number_or_none(current_price)
    alternatives = _normalize_alternatives(parsed.get("alternatives"), current_price_number)
    warnings = parsed.get("warnings") if isinstance(parsed.get("warnings"), list) else []
    clean_warnings = [str(item).strip() for item in warnings if str(item).strip()][:3]
    if not clean_warnings:
        clean_warnings = ["Verify price, stock, and seller before buying."]

    verdict = str(parsed.get("verdict") or "").strip()
    if not verdict:
        verdict = "No clearly cheaper verified alternatives were found." if not alternatives else "Cheaper alternatives may be available."

    response_text = verdict
    if alternatives:
        response_text += "\n\n" + "\n".join(
            f"- {item['name']} at {item['store']} for PKR {item['price']:.0f}"
            + (f" - save about PKR {item['savings']:.0f}" if item["savings"] else "")
            for item in alternatives
        )

    return {
        "response": response_text,
        "verdict": verdict,
        "alternatives": alternatives,
        "warnings": clean_warnings,
        "sources": sources,
    }


def scan_receipt_image(image_base64, mime_type="image/jpeg"):
    if not client:
        raise RuntimeError("AI is not configured. Add GEMINI_API_KEY to the backend environment.")

    try:
        image_bytes = base64.b64decode(image_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Receipt image is not valid base64.") from exc

    today = date.today().isoformat()

    prompt = f"""
Extract one expense transaction from this receipt image.

Return JSON only with this exact shape:
{{
  "amount": number,
  "category": "food" | "groceries" | "transport" | "shopping" | "utilities" | "rent" | "grooming" | "health" | "education" | "other",
  "date": "YYYY-MM-DD",
  "merchant": string,
  "items": [{{"name": string, "price": number}}],
  "confidence": number,
  "notes": string
}}

Rules:
- Use the receipt total as amount, not subtotal, unless total is unavailable.
- If the date is missing or unreadable, use today's date: {today}.
- If item prices are unclear, return an empty items array.
- Use PKR-style numeric values without currency symbols.
- Keep category lowercase.
- Confidence must be between 0 and 1.
- Do not include markdown.
"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ],
        config=types.GenerateContentConfig(responseMimeType="application/json"),
    )

    try:
        result = json.loads(response.text)
    except json.JSONDecodeError as exc:
        raise RuntimeError("AI could not read the receipt clearly. Try a sharper photo.") from exc

    amount = _number_or_none(result.get("amount")) or 0

    return {
        "amount": round(amount, 2),
        "category": str(result.get("category") or "other").strip().lower(),
        "date": _valid_date_or_today(result.get("date")),
        "merchant": str(result.get("merchant") or "Unknown merchant").strip(),
        "items": _normalize_receipt_items(result.get("items")),
        "confidence": _clamp_confidence(result.get("confidence")),
        "notes": str(result.get("notes") or "").strip(),
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
