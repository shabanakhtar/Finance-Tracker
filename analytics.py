from data import load_data

def calculate_balance():
    total_income = 0
    total_expense = 0

    data = load_data()

    for row in data:
        if row["type"] == "income":
            total_income += row["amount"]
        elif row["type"] == "expense":
            total_expense += row["amount"]

    balance = total_income - total_expense

    return {
        "income": total_income,
        "expense": total_expense,
        "balance": balance
    }


def category_summary():
    summary = {}

    data = load_data()

    for row in data:
        category = row["category"]
        type_ = row["type"]
        amount = row["amount"]

        if category not in summary:
            summary[category] = {"income": 0, "expense": 0}

        if type_ == "income":
            summary[category]["income"] += amount
        elif type_ == "expense":
            summary[category]["expense"] += amount

    return summary


def monthly_summary():
    summary = {}

    data = load_data()

    for row in data:
        month = row["date"][:7]

        if month not in summary:
            summary[month] = {"income": 0, "expense": 0}

        if row["type"] == "income":
            summary[month]["income"] += row["amount"]
        else:
            summary[month]["expense"] += row["amount"]

    return summary


def top_categories():
    totals = {}

    data = load_data()

    for row in data:
        if row["type"] != "expense":
            continue

        category = row["category"]

        if category not in totals:
            totals[category] = 0

        totals[category] += row["amount"]

    sorted_totals = sorted(totals.items(), key=lambda x: x[1], reverse=True)

    return sorted_totals[:3]


def expense_breakdown():
    totals = {}
    total_expense = 0

    data = load_data()

    for row in data:
        if row["type"] != "expense":
            continue

        category = row["category"]
        amount = row["amount"]

        total_expense += amount

        if category not in totals:
            totals[category] = 0

        totals[category] += amount

    breakdown = {}

    if total_expense == 0:
        return breakdown

    for cat, val in totals.items():
        breakdown[cat] = (val / total_expense) * 100

    return breakdown