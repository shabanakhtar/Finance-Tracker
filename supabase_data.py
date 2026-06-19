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
        "amount": float(row["amount"]),
        "category": row["category"].strip().lower(),
        "type": row["type"].strip().lower(),
        "date": row["date"],
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

    return env("FINANCE_DEMO_USER_ID")


def require_user_id(user_id):
    if not user_id:
        raise PermissionError("Supabase mode requires an authenticated user or FINANCE_DEMO_USER_ID")
    return user_id


def load_transactions(user_id):
    user_id = require_user_id(user_id)
    query = (
        "/rest/v1/transactions"
        "?select=id,amount,category,type,date,created_at"
        f"&user_id=eq.{quote(user_id)}"
        "&order=date.desc,created_at.desc"
    )
    rows = _request("GET", query)
    return [_normalize_transaction(row) for row in rows]


def add_transaction(amount, category, type_, date, user_id):
    user_id = require_user_id(user_id)
    amount = _validate_transaction(amount, category, type_, date)
    payload = {
        "user_id": user_id,
        "amount": amount,
        "category": category.strip().lower(),
        "type": type_.strip().lower(),
        "date": date,
    }
    _request("POST", "/rest/v1/transactions", payload, prefer="return=minimal")
    return {"message": "Transaction added successfully"}
