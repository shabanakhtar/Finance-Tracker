import csv
import io
import time
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, field_validator
from data import (
    add_transaction_api,
    delete_budget_api,
    delete_transaction_api,
    load_budget_settings,
    load_data,
    save_budget_api,
    update_transaction_api,
)
from analytics import (
    calculate_balance,
    calculate_financial_score,
    calculate_savings_rate,
    category_summary,
    category_trends,
    detect_patterns,
    detect_recurring_expenses,
    detect_top_trends,
    expense_breakdown,
    generate_smart_warnings,
    generate_insight_cards,
    monthly_summary,
    phase_two_opportunities,
    top_categories,
)
from ai import ask_ai, scan_receipt_image, search_local_market
from ai_usage import AiLimitExceeded, ensure_ai_limit, get_usage_status, record_ai_usage
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from settings import env, env_list, use_supabase
from supabase_data import load_ai_insight_context, resolve_user_id

DEFAULT_CORS_ORIGINS = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
]

WRITE_RATE_LIMITS = {
    "budget_write": (30, 60),
    "csv_import": (6, 300),
    "transaction_delete": (40, 60),
    "transaction_update": (60, 60),
    "transaction_write": (60, 60),
}
_RATE_LIMIT_BUCKETS = defaultdict(deque)


def configured_cors_origins():
    origins = env_list("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    if "*" not in origins:
        return origins
    if env("ALLOW_WILDCARD_CORS", "false").lower() == "true":
        return origins
    return [origin for origin in origins if origin != "*"] or DEFAULT_CORS_ORIGINS


app = FastAPI(title="AI Finance Tracker API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("Cache-Control", "no-store")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    return response

DEFAULT_BUDGETS = {
    "food": 15000,
    "rent": 50000,
    "transport": 10000,
    "shopping": 20000,
    "utilities": 12000,
}

CSV_HEADERS = ["date", "type", "category", "amount", "notes"]

AI_FEATURES = {
    "chat": "ai_chat",
    "market": "product_recommendation",
    "receipt": "receipt_scan",
}

class TransactionRequest(BaseModel):
    amount: float
    category: str
    type: str
    date: str
    notes: str | None = None

    class Config:
        json_schema_extra = {
            "example": {
                "amount": 500,
                "category": "food",
                "type": "expense",
                "date": "2026-03-23"
            }
        }

    @field_validator("amount")
    def validate_amount(cls, value):
        if value <= 0:
            raise ValueError("Amount must be greater than 0")
        return value

    @field_validator("type")
    def validate_type(cls, value):
        if value.lower() not in ["income", "expense"]:
            raise ValueError("Type must be 'income' or 'expense'")
        return value.lower()

    @field_validator("date")
    def validate_date(cls, value):
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except:
            raise ValueError("Date must be in YYYY-MM-DD format")
        return value

    @field_validator("notes")
    def validate_notes(cls, value):
        return value.strip()[:500] if value else None


class BudgetRequest(BaseModel):
    category: str
    limit_amount: float

    @field_validator("category")
    def validate_category(cls, value):
        if not value.strip():
            raise ValueError("Category is required")
        return value.strip().lower()

    @field_validator("limit_amount")
    def validate_limit_amount(cls, value):
        if value <= 0:
            raise ValueError("Budget limit must be greater than 0")
        return value


class CsvImportRequest(BaseModel):
    csv_text: str
    commit: bool = False

    @field_validator("csv_text")
    def validate_csv_text(cls, value):
        cleaned = value.strip("\ufeff\r\n ")
        if not cleaned:
            raise ValueError("CSV file is empty")
        if len(cleaned) > 1_000_000:
            raise ValueError("CSV file is too large")
        return cleaned


@app.get("/")
def home():
    return {"message": "Finance API is running"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "data_source": "supabase" if use_supabase() else "csv"
    }


def current_user_id(request: Request):
    if not use_supabase():
        return None

    user_id = resolve_user_id(request.headers.get("authorization"))
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail={
                "status": "error",
                "message": "Supabase mode requires a valid user session"
            }
        )
    return user_id


def rate_limit_subject(request: Request, user_id):
    if user_id:
        return f"user:{user_id}"
    host = request.client.host if request.client else "unknown"
    return f"ip:{host}"


def enforce_write_rate_limit(request: Request, user_id, scope):
    limit, window_seconds = WRITE_RATE_LIMITS[scope]
    bucket_key = f"{scope}:{rate_limit_subject(request, user_id)}"
    now = time.monotonic()
    bucket = _RATE_LIMIT_BUCKETS[bucket_key]

    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()

    if len(bucket) >= limit:
        retry_after = max(1, int(window_seconds - (now - bucket[0])))
        raise HTTPException(
            status_code=429,
            headers={"Retry-After": str(retry_after)},
            detail={
                "status": "error",
                "code": "WRITE_RATE_LIMIT_REACHED",
                "message": "Too many changes in a short time. Wait a moment, then try again.",
                "retry_after_seconds": retry_after,
            },
        )

    bucket.append(now)


def ai_limit_error(status):
    return HTTPException(
        status_code=429,
        detail={
            "status": "error",
            "code": "AI_DAILY_LIMIT_REACHED",
            "message": status.message,
            "limit": status.as_dict(),
        },
    )


def ai_success(data, usage_status=None):
    payload = {
        "status": "success",
        "data": data,
    }
    if usage_status:
        payload["limit"] = usage_status.as_dict()
    return payload


def budget_status(data, budgets):
    spent_by_category = {}
    for row in data:
        if row["type"] != "expense":
            continue
        spent_by_category[row["category"]] = spent_by_category.get(row["category"], 0) + row["amount"]

    status = []
    for budget in budgets:
        spent = spent_by_category.get(budget["category"], 0)
        limit_amount = budget["limit_amount"]
        status.append({
            **budget,
            "spent": spent,
            "remaining": limit_amount - spent,
            "progress": min(spent / limit_amount, 1) if limit_amount else 0,
            "is_over": spent > limit_amount,
        })

    return status


def csv_export_text(data):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_HEADERS, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()

    for row in sorted(data, key=lambda item: item["date"], reverse=True):
        writer.writerow({
            "date": row.get("date", ""),
            "type": row.get("type", ""),
            "category": row.get("category", ""),
            "amount": row.get("amount", ""),
            "notes": row.get("notes", ""),
        })

    return output.getvalue()


def parse_csv_import(csv_text):
    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise ValueError("CSV must include a header row")

    normalized_headers = {header.strip().lower(): header for header in reader.fieldnames if header}
    required = ["date", "type", "category", "amount"]
    missing = [header for header in required if header not in normalized_headers]
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing)}")

    valid_rows = []
    errors = []

    for index, raw_row in enumerate(reader, start=2):
        date_value = (raw_row.get(normalized_headers["date"]) or "").strip()
        type_value = (raw_row.get(normalized_headers["type"]) or "").strip().lower()
        category_value = (raw_row.get(normalized_headers["category"]) or "").strip().lower()
        amount_text = (raw_row.get(normalized_headers["amount"]) or "").replace(",", "").strip()
        notes_value = (raw_row.get(normalized_headers.get("notes", "")) or "").strip() if "notes" in normalized_headers else ""
        row_errors = []

        try:
            datetime.strptime(date_value, "%Y-%m-%d")
        except ValueError:
            row_errors.append("date must be YYYY-MM-DD")

        if type_value not in {"income", "expense"}:
            row_errors.append("type must be income or expense")

        if not category_value:
            row_errors.append("category is required")

        try:
            amount_value = float(amount_text)
            if amount_value <= 0:
                row_errors.append("amount must be greater than 0")
        except ValueError:
            amount_value = 0
            row_errors.append("amount must be numeric")

        row = {
            "row": index,
            "date": date_value,
            "type": type_value,
            "category": category_value,
            "amount": amount_value,
            "notes": notes_value,
        }

        if row_errors:
            errors.append({**row, "errors": row_errors})
        else:
            valid_rows.append(row)

    return {
        "valid_rows": valid_rows,
        "errors": errors,
        "valid_count": len(valid_rows),
        "error_count": len(errors),
        "preview": valid_rows[:10],
    }


@app.get("/summary")
def get_summary(request: Request):
    data = load_data(current_user_id(request))
    return {
        "status": "success",
        "data": calculate_balance(data)
    }


@app.get("/transactions")
def get_transactions(request: Request, limit: int = 20):
    data = sorted(load_data(current_user_id(request)), key=lambda row: row["date"], reverse=True)
    return {
        "status": "success",
        "data": data[:limit]
    }


@app.get("/transactions/export")
def export_transactions(request: Request):
    data = load_data(current_user_id(request))
    return {
        "status": "success",
        "data": {
            "filename": f"finance-transactions-{datetime.now().strftime('%Y-%m-%d')}.csv",
            "csv": csv_export_text(data),
            "count": len(data),
        }
    }


@app.post("/transactions/import/preview")
def preview_transactions_import(request: CsvImportRequest, http_request: Request):
    current_user_id(http_request)
    try:
        parsed = parse_csv_import(request.csv_text)
        return {
            "status": "success",
            "data": parsed,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "message": str(e)
            }
        )


@app.post("/transactions/import")
def import_transactions(request: CsvImportRequest, http_request: Request):
    user_id = current_user_id(http_request)
    enforce_write_rate_limit(http_request, user_id, "csv_import")
    try:
        parsed = parse_csv_import(request.csv_text)
        if parsed["error_count"]:
            raise ValueError("Fix invalid rows before importing")

        imported = 0
        for row in parsed["valid_rows"]:
            add_transaction_api(row["amount"], row["category"], row["type"], row["date"], user_id, row["notes"])
            imported += 1

        return {
            "status": "success",
            "data": {
                **parsed,
                "imported": imported,
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "message": str(e)
            }
        )


@app.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: str, request: TransactionRequest, http_request: Request):
    user_id = current_user_id(http_request)
    enforce_write_rate_limit(http_request, user_id, "transaction_update")
    try:
        result = update_transaction_api(
            transaction_id,
            request.amount,
            request.category,
            request.type,
            request.date,
            user_id,
            request.notes,
        )

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e)
            }
        )


@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, request: Request):
    user_id = current_user_id(request)
    enforce_write_rate_limit(request, user_id, "transaction_delete")
    try:
        result = delete_transaction_api(transaction_id, user_id)

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e)
            }
        )


@app.get("/dashboard")
def get_dashboard(request: Request):
    user_id = current_user_id(request)
    data = load_data(user_id)
    budgets = load_budget_settings(user_id)
    budget_limits = {item["category"]: item["limit_amount"] for item in budgets}
    active_budgets = budget_limits or DEFAULT_BUDGETS
    summary = calculate_balance(data)

    return {
        "status": "success",
        "data": {
            "summary": summary,
            "categories": category_summary(data),
            "monthly": monthly_summary(data),
            "top_categories": top_categories(data),
            "breakdown": expense_breakdown(data),
            "recent_transactions": sorted(
                data,
                key=lambda row: row["date"],
                reverse=True
            )[:6],
            "insights": (
                detect_patterns(data)
                + category_trends(data)
                + detect_top_trends(data)
                + calculate_savings_rate(data)
            )[:6],
            "insight_cards": generate_insight_cards(data, active_budgets),
            "recurring": detect_recurring_expenses(data),
            "opportunities": phase_two_opportunities(data, active_budgets),
            "budgets": budgets,
            "budget_status": budget_status(data, budgets),
            "warnings": generate_smart_warnings(data, active_budgets),
            "financial_score": calculate_financial_score(data),
            "transaction_count": len(data),
        }
    }


@app.get("/budgets")
def get_budgets(request: Request):
    user_id = current_user_id(request)
    data = load_data(user_id)
    budgets = load_budget_settings(user_id)
    return {
        "status": "success",
        "data": {
            "budgets": budgets,
            "budget_status": budget_status(data, budgets),
        }
    }


@app.post("/budgets")
def save_budget(request: BudgetRequest, http_request: Request):
    user_id = current_user_id(http_request)
    enforce_write_rate_limit(http_request, user_id, "budget_write")
    try:
        result = save_budget_api(request.category, request.limit_amount, user_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e)
            }
        )


@app.delete("/budgets/{category}")
def delete_budget(category: str, request: Request):
    user_id = current_user_id(request)
    enforce_write_rate_limit(request, user_id, "budget_write")
    try:
        result = delete_budget_api(category, user_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e)
            }
        )

@app.get("/categories")
def get_categories(request: Request):
    data = load_data(current_user_id(request))
    return {
        "status": "success",
        "data": category_summary(data)
    }


@app.get("/monthly")
def get_monthly(request: Request):
    data = load_data(current_user_id(request))
    return {
        "status": "success",
        "data": monthly_summary(data)
    }


@app.get("/top")
def get_top_spending(request: Request):
    data = load_data(current_user_id(request))
    return {
        "status": "success",
        "data": top_categories(data)
    }

@app.get("/breakdown")
def get_breakdown(request: Request):
    data = load_data(current_user_id(request))
    return {
        "status": "success",
        "data": expense_breakdown(data)
    }


@app.get("/ai-limits")
def get_ai_limits(request: Request):
    try:
        user_id = current_user_id(request)
        return {
            "status": "success",
            "data": {
                name: get_usage_status(user_id, feature).as_dict()
                for name, feature in AI_FEATURES.items()
            },
        }
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "message": str(e)
            }
        )


@app.get("/ai-context")
def get_ai_context(request: Request):
    try:
        user_id = current_user_id(request)
        if not use_supabase():
            raise HTTPException(
                status_code=400,
                detail={
                    "status": "error",
                    "message": "SQL-backed AI context is available only in Supabase mode."
                }
            )
        return {
            "status": "success",
            "data": load_ai_insight_context(user_id),
        }
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "message": str(e)
            }
        )


class AIRequest(BaseModel):
    question: str

    @field_validator("question")
    def validate_question(cls, value):
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Question is required")
        if len(cleaned) > 1000:
            raise ValueError("Question must be 1000 characters or fewer")
        return cleaned


class MarketSearchRequest(BaseModel):
    product_name: str
    current_price: float | None = None
    category: str | None = None
    location: str = "Pakistan"

    @field_validator("product_name")
    def validate_product_name(cls, value):
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Product name is required")
        if len(cleaned) > 160:
            raise ValueError("Product name must be 160 characters or fewer")
        return cleaned

    @field_validator("current_price")
    def validate_current_price(cls, value):
        if value is not None and value <= 0:
            raise ValueError("Current price must be greater than 0")
        return value

    @field_validator("category")
    def validate_market_category(cls, value):
        return value.strip().lower() if value else None

    @field_validator("location")
    def validate_location(cls, value):
        cleaned = value.strip() or "Pakistan"
        if len(cleaned) > 80:
            raise ValueError("Location must be 80 characters or fewer")
        return cleaned


class ReceiptScanRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"

    @field_validator("image_base64")
    def validate_image_base64(cls, value):
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Receipt image is required")
        if len(cleaned) > 12_000_000:
            raise ValueError("Receipt image is too large")
        return cleaned

    @field_validator("mime_type")
    def validate_mime_type(cls, value):
        cleaned = value.strip().lower()
        if cleaned not in ["image/jpeg", "image/jpg", "image/png", "image/webp"]:
            raise ValueError("Receipt image must be JPEG, PNG, or WEBP")
        return "image/jpeg" if cleaned == "image/jpg" else cleaned


@app.post("/ask-ai")
def ask_ai_endpoint(request: AIRequest, http_request: Request):
    try:
        user_id = current_user_id(http_request)
        ensure_ai_limit(user_id, AI_FEATURES["chat"])
        if use_supabase():
            response = ask_ai(request.question, finance_context=load_ai_insight_context(user_id))
        else:
            data = load_data(user_id)
            budgets = load_budget_settings(user_id)
            response = ask_ai(request.question, data, budgets)
        usage_status = record_ai_usage(user_id, AI_FEATURES["chat"])

        return ai_success({"response": response}, usage_status)

    except AiLimitExceeded as e:
        raise ai_limit_error(e.status)
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "message": str(e)
            }
        )
    except Exception: # catch any unexpected errors
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": "AI is temporarily unavailable. Please try again soon."
            }
        )


@app.post("/market-search")
def market_search_endpoint(request: MarketSearchRequest, http_request: Request):
    try:
        user_id = current_user_id(http_request)
        ensure_ai_limit(user_id, AI_FEATURES["market"])
        result = search_local_market(
            request.product_name,
            request.current_price,
            request.category,
            request.location,
        )
        usage_status = record_ai_usage(user_id, AI_FEATURES["market"])

        return ai_success(result, usage_status)

    except AiLimitExceeded as e:
        raise ai_limit_error(e.status)
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "message": str(e)
            }
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": "Market search is temporarily unavailable. Please try again soon."
            }
        )


@app.post("/scan-receipt")
def scan_receipt_endpoint(request: ReceiptScanRequest, http_request: Request):
    try:
        user_id = current_user_id(http_request)
        ensure_ai_limit(user_id, AI_FEATURES["receipt"])
        result = scan_receipt_image(request.image_base64, request.mime_type)
        usage_status = record_ai_usage(user_id, AI_FEATURES["receipt"])

        return ai_success(result, usage_status)

    except AiLimitExceeded as e:
        raise ai_limit_error(e.status)
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "message": str(e)
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "message": str(e)
            }
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": "Receipt scan is temporarily unavailable. Please try again soon."
            }
        )

@app.post("/add-transaction")
def add_transaction(request: TransactionRequest, http_request: Request):
    user_id = current_user_id(http_request)
    enforce_write_rate_limit(http_request, user_id, "transaction_write")
    try:
        result = add_transaction_api(
            request.amount,
            request.category,
            request.type,
            request.date,
            user_id,
            request.notes,
        )

        return {
            "status": "success",
            "data": result
        }

    except Exception as e: # catch any unexpected errors
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e)
            }
        )
