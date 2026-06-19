from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
from data import load_data, add_transaction_api
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

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/")
def home():
    return {"message": "Finance API is running"}


@app.get("/summary")
def get_summary():
    data = load_data()
    return {
        "status": "success",
        "data": calculate_balance(data)
    }


@app.get("/transactions")
def get_transactions(limit: int = 20):
    data = sorted(load_data(), key=lambda row: row["date"], reverse=True)
    return {
        "status": "success",
        "data": data[:limit]
    }


@app.get("/dashboard")
def get_dashboard():
    data = load_data()
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
            "warnings": generate_smart_warnings(data, DEFAULT_BUDGETS),
            "financial_score": calculate_financial_score(data),
            "transaction_count": len(data),
        }
    }

@app.get("/categories")
def get_categories():
    data = load_data()
    return {
        "status": "success",
        "data": category_summary(data)
    }


@app.get("/monthly")
def get_monthly():
    data = load_data()
    return {
        "status": "success",
        "data": monthly_summary(data)
    }


@app.get("/top")
def get_top_spending():
    data = load_data()
    return {
        "status": "success",
        "data": top_categories(data)
    }

@app.get("/breakdown")
def get_breakdown():
    data = load_data()
    return {
        "status": "success",
        "data": expense_breakdown(data)
    }


class AIRequest(BaseModel):
    question: str



@app.post("/ask-ai")
def ask_ai_endpoint(request: AIRequest):
    try:
        data = load_data()
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
def add_transaction(request: TransactionRequest):
    try:
        result = add_transaction_api(
            request.amount,
            request.category,
            request.type,
            request.date
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
