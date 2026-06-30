import json
from datetime import datetime
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

from settings import env


def _required_env(name):
    value = env(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value.rstrip("/") if name == "SUPABASE_URL" else value


def _headers(use_user_token=None, prefer=None):
    service_key = _required_env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {use_user_token or service_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _request(method, path, payload=None, use_user_token=None, prefer=None):
    url = f"{_required_env('SUPABASE_URL')}{path}"
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(url, data=body, method=method, headers=_headers(use_user_token, prefer))

    try:
        with urlopen(request, timeout=20) as response:
            raw_body = response.read().decode("utf-8")
            return json.loads(raw_body) if raw_body else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"Supabase request failed ({exc.code}): {detail}") from exc


def _normalize_transaction(row):
    return {
        "id": row.get("id"),
        "amount": float(row["amount"]),
        "category": row["category"].strip().lower(),
        "type": row["type"].strip().lower(),
        "date": row["date"],
        "notes": row.get("notes") or "",
    }


def _normalize_budget(row):
    return {
        "id": row.get("id"),
        "category": row["category"].strip().lower(),
        "limit_amount": float(row["limit_amount"]),
    }


def _validate_transaction(amount, category, type_, date):
    if not category or type_ not in {"income", "expense"}:
        raise ValueError("Invalid transaction data")
    datetime.strptime(date, "%Y-%m-%d")
    amount = float(amount)
    if amount <= 0:
        raise ValueError("Amount must be greater than 0")
    return amount


def resolve_user_id(auth_header=None):
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        anon_key = env("SUPABASE_ANON_KEY")
        if anon_key:
            url = f"{_required_env('SUPABASE_URL')}/auth/v1/user"
            request = Request(
                url,
                method="GET",
                headers={
                    "apikey": anon_key,
                    "Authorization": f"Bearer {token}",
                },
            )
            try:
                with urlopen(request, timeout=20) as response:
                    user = json.loads(response.read().decode("utf-8"))
                    return user.get("id")
            except HTTPError:
                return None

    if env("ALLOW_DEMO_USER", "false").lower() == "true":
        return env("FINANCE_DEMO_USER_ID")

    return None


def require_user_id(user_id):
    if not user_id:
        raise PermissionError("Supabase mode requires an authenticated user or FINANCE_DEMO_USER_ID")
    return user_id


def load_transactions(user_id):
    user_id = require_user_id(user_id)
    query = (
        "/rest/v1/transactions"
        "?select=id,amount,category,type,date,notes,created_at"
        f"&user_id=eq.{quote(user_id)}"
        "&order=date.desc,created_at.desc"
    )
    rows = _request("GET", query)
    return [_normalize_transaction(row) for row in rows]


def add_transaction(amount, category, type_, date, user_id, notes=None):
    user_id = require_user_id(user_id)
    amount = _validate_transaction(amount, category, type_, date)
    payload = {
        "user_id": user_id,
        "amount": amount,
        "category": category.strip().lower(),
        "type": type_.strip().lower(),
        "date": date,
        "notes": (notes or "").strip(),
    }
    _request("POST", "/rest/v1/transactions", payload, prefer="return=minimal")
    return {"message": "Transaction added successfully"}


def update_transaction(transaction_id, amount, category, type_, date, user_id, notes=None):
    user_id = require_user_id(user_id)
    amount = _validate_transaction(amount, category, type_, date)
    payload = {
        "amount": amount,
        "category": category.strip().lower(),
        "type": type_.strip().lower(),
        "date": date,
        "notes": (notes or "").strip(),
    }
    query = (
        "/rest/v1/transactions"
        f"?id=eq.{quote(transaction_id)}"
        f"&user_id=eq.{quote(user_id)}"
    )
    _request("PATCH", query, payload, prefer="return=minimal")
    return {"message": "Transaction updated successfully"}


def delete_transaction(transaction_id, user_id):
    user_id = require_user_id(user_id)
    query = (
        "/rest/v1/transactions"
        f"?id=eq.{quote(transaction_id)}"
        f"&user_id=eq.{quote(user_id)}"
    )
    _request("DELETE", query, prefer="return=minimal")
    return {"message": "Transaction deleted successfully"}


def load_budgets(user_id):
    user_id = require_user_id(user_id)
    query = (
        "/rest/v1/budgets"
        "?select=id,category,limit_amount"
        f"&user_id=eq.{quote(user_id)}"
        "&order=category.asc"
    )
    try:
        rows = _request("GET", query)
    except RuntimeError as exc:
        if "budgets" in str(exc) and ("PGRST" in str(exc) or "schema cache" in str(exc)):
            return []
        raise
    return [_normalize_budget(row) for row in rows]


def upsert_budget(category, limit_amount, user_id):
    user_id = require_user_id(user_id)
    category = category.strip().lower()
    amount = float(limit_amount)
    if not category or amount <= 0:
        raise ValueError("Invalid budget data")

    payload = {
        "user_id": user_id,
        "category": category,
        "limit_amount": amount,
    }
    try:
        _request(
            "POST",
            "/rest/v1/budgets?on_conflict=user_id,category",
            payload,
            prefer="resolution=merge-duplicates,return=minimal",
        )
    except RuntimeError as exc:
        if "budgets" in str(exc) and ("PGRST" in str(exc) or "schema cache" in str(exc)):
            raise RuntimeError("Budgets table is not set up yet. Run the add_budgets migration in Supabase.") from exc
        raise
    return {"message": "Budget saved successfully"}


def delete_budget(category, user_id):
    user_id = require_user_id(user_id)
    query = (
        "/rest/v1/budgets"
        f"?user_id=eq.{quote(user_id)}"
        f"&category=eq.{quote(category.strip().lower())}"
    )
    _request("DELETE", query, prefer="return=minimal")
    return {"message": "Budget deleted successfully"}


def get_ai_usage(user_id, feature, period):
    user_id = require_user_id(user_id)
    query = (
        "/rest/v1/ai_usage"
        "?select=id,count,last_used_at,cached_response,cached_at"
        f"&user_id=eq.{quote(user_id)}"
        f"&feature=eq.{quote(feature)}"
        f"&period_start=eq.{quote(period)}"
        "&limit=1"
    )
    try:
        rows = _request("GET", query)
    except RuntimeError as exc:
        if "ai_usage" in str(exc) and ("PGRST" in str(exc) or "schema cache" in str(exc)):
            raise RuntimeError("AI usage table is not set up yet. Run the add_ai_usage_limits migration in Supabase.") from exc
        raise
    return rows[0] if rows else None


def upsert_ai_usage(user_id, feature, period, count, last_used_at, cached_response=None, cached_at=None):
    user_id = require_user_id(user_id)
    payload = {
        "user_id": user_id,
        "feature": feature,
        "period_start": period,
        "count": int(count),
        "last_used_at": last_used_at,
        "cached_response": cached_response,
        "cached_at": cached_at,
    }
    try:
        _request(
            "POST",
            "/rest/v1/ai_usage?on_conflict=user_id,feature,period_start",
            payload,
            prefer="resolution=merge-duplicates,return=minimal",
        )
    except RuntimeError as exc:
        if "ai_usage" in str(exc) and ("PGRST" in str(exc) or "schema cache" in str(exc)):
            raise RuntimeError("AI usage table is not set up yet. Run the add_ai_usage_limits migration in Supabase.") from exc
        raise
    return {"message": "AI usage recorded"}
