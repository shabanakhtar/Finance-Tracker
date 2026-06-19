import csv
from datetime import datetime

from settings import use_supabase
from supabase_data import add_transaction as add_supabase_transaction
from supabase_data import load_transactions


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
                        "date": transaction_date
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



def add_transaction_api(amount, category, type_, date, user_id=None):
    if use_supabase():
        return add_supabase_transaction(amount, category, type_, date, user_id)

    # Validate input
    if not category or not type_ or not date:
        return {"message": "Invalid transaction data"}
    try:
        with open("data.csv", mode="a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([amount, category.lower(), type_.lower(), date])

        return {"message": "Transaction added successfully"}

    except Exception as e:
        return {"message": f"Error saving transaction: {str(e)}"}
