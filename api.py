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
    monthly_summary,
    top_categories,
)
from ai import ask_ai
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from settings import env_list, use_supabase
from supabase_data import resolve_user_id

DEFAULT_CORS_ORIGINS = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
]

app = FastAPI(title="AI Finance Tracker API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=env_list("CORS_ORIGINS", DEFAULT_CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_BUDGETS = {
    "food": 15000,
    "rent": 50000,
    "transport": 10000,
    "shopping": 20000,
    "utilities": 12000,
}

class TransactionRequest(BaseModel):
    amount: float
    category: str
    type: str
    date: str

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


@app.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: str, request: TransactionRequest, http_request: Request):
    try:
        result = update_transaction_api(
            transaction_id,
            request.amount,
            request.category,
            request.type,
            request.date,
            current_user_id(http_request)
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
    try:
        result = delete_transaction_api(transaction_id, current_user_id(request))

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
            "recurring": detect_recurring_expenses(data),
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
    try:
        result = save_budget_api(request.category, request.limit_amount, current_user_id(http_request))
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
    try:
        result = delete_budget_api(category, current_user_id(request))
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


class AIRequest(BaseModel):
    question: str



@app.post("/ask-ai")
def ask_ai_endpoint(request: AIRequest, http_request: Request):
    try:
        data = load_data(current_user_id(http_request))
        response = ask_ai(request.question, data)

        return {
            "status": "success",
            "data": {
                "response": response
            }
        }

    except Exception as e: # catch any unexpected errors
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e)
            }
        )

@app.post("/add-transaction")
def add_transaction(request: TransactionRequest, http_request: Request):
    try:
        result = add_transaction_api(
            request.amount,
            request.category,
            request.type,
            request.date,
            current_user_id(http_request)
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
