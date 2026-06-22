import csv
from datetime import datetime

from settings import use_supabase
from supabase_data import add_transaction as add_supabase_transaction
from supabase_data import delete_budget as delete_supabase_budget
from supabase_data import delete_transaction as delete_supabase_transaction
from supabase_data import load_budgets as load_supabase_budgets
from supabase_data import load_transactions
from supabase_data import update_transaction as update_supabase_transaction
from supabase_data import upsert_budget as upsert_supabase_budget


def load_data(user_id=None):
    if use_supabase():
        return load_transactions(user_id)

    data = []

    try:
        with open("data.csv", "r") as file:
            reader = csv.reader(file)

            for i, row in enumerate(reader):
                if i == 0:
                    continue
                if len(row) < 4:
                    continue

                try:
                    transaction_type = row[2].strip().lower()
                    if transaction_type not in {"income", "expense"}:
                        continue

                    transaction_date = row[3].strip()
                    datetime.strptime(transaction_date, "%Y-%m-%d")

                    data.append({
                        "amount": float(row[0]),
                        "category": row[1].strip().lower(),
                        "type": transaction_type,
                        "date": transaction_date,
                        "notes": row[4].strip() if len(row) > 4 else "",
                    })
                except:
                    continue

    except FileNotFoundError:
        return []

    except Exception as e:
        print("Error loading data:", e)
        return []

    return data


def add_transaction():
    amount = input("Enter amount: ")
    category = input("Enter category: ").strip().lower()
    type_ = input("Type (income/expense): ").strip().lower()
    date = input("Enter date (YYYY-MM-DD): ")

    with open("data.csv", mode="a", newline="") as file:
        writer = csv.writer(file)
        writer.writerow([amount, category, type_, date])

    print("Transaction added.\n")



def add_transaction_api(amount, category, type_, date, user_id=None, notes=None):
    if use_supabase():
        return add_supabase_transaction(amount, category, type_, date, user_id, notes)

    # Validate input
    if not category or not type_ or not date:
        return {"message": "Invalid transaction data"}
    try:
        with open("data.csv", mode="a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([amount, category.lower(), type_.lower(), date, notes or ""])

        return {"message": "Transaction added successfully"}

    except Exception as e:
        return {"message": f"Error saving transaction: {str(e)}"}


def update_transaction_api(transaction_id, amount, category, type_, date, user_id=None, notes=None):
    if use_supabase():
        return update_supabase_transaction(transaction_id, amount, category, type_, date, user_id, notes)

    return {"message": "Editing transactions requires Supabase mode"}


def delete_transaction_api(transaction_id, user_id=None):
    if use_supabase():
        return delete_supabase_transaction(transaction_id, user_id)

    return {"message": "Deleting transactions requires Supabase mode"}


def load_budget_settings(user_id=None):
    if use_supabase():
        return load_supabase_budgets(user_id)

    return []


def save_budget_api(category, limit_amount, user_id=None):
    if use_supabase():
        return upsert_supabase_budget(category, limit_amount, user_id)

    return {"message": "Budget settings require Supabase mode"}


def delete_budget_api(category, user_id=None):
    if use_supabase():
        return delete_supabase_budget(category, user_id)

    return {"message": "Budget settings require Supabase mode"}
