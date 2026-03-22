def calculate_balance(data):
    total_income = 0
    total_expense = 0


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


def category_summary(data):
    summary = {}



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


def monthly_summary(data):
    summary = {}


    for row in data:
        month = row["date"][:7]

        if month not in summary:
            summary[month] = {"income": 0, "expense": 0}

        if row["type"] == "income":
            summary[month]["income"] += row["amount"]
        else:
            summary[month]["expense"] += row["amount"]

    return summary


def top_categories(data):
    totals = {}


    for row in data:
        if row["type"] != "expense":
            continue

        category = row["category"]

        if category not in totals:
            totals[category] = 0

        totals[category] += row["amount"]

    sorted_totals = sorted(totals.items(), key=lambda x: x[1], reverse=True)

    return sorted_totals[:3]


def expense_breakdown(data):
    totals = {}
    total_expense = 0


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

def detect_patterns(data):
    patterns = []

    monthly_expense = {}
    category_expense = {}

    for row in data:
        if row["type"] != "expense":
            continue

        month = row["date"][:7]
        category = row["category"]
        amount = row["amount"]

        monthly_expense[month] = monthly_expense.get(month, 0) + amount
        category_expense[category] = category_expense.get(category, 0) + amount
    
    # Checking for trends
    months = sorted(monthly_expense.keys())

    if len(months) >= 2:
        last_month = months[-1]
        prev_month = months[-2]

        last_value = monthly_expense[last_month]
        prev_value = monthly_expense[prev_month]

        if last_value > prev_value:
            patterns.append("Spending has gone up compared to last month.")
        elif last_value < prev_value:
            patterns.append("Spending has gone down compared to last month.")

    # Checking for anomalies
    if category_expense:
        average = sum(category_expense.values()) / len(category_expense)

        for category, value in category_expense.items():
            if value > average * 1.5:
                patterns.append(f"Spending in {category} is higher than usual.")

    return patterns

def calculate_financial_score(data):
    score = 100

    income = 0
    expense = 0

    for row in data:
        if row["type"] == "income":
            income += row["amount"]
        else:
            expense += row["amount"]

    if income == 0:
        return 0

    ratio = expense / income

    if ratio > 1:
        score -= 40
    elif ratio > 0.8:
        score -= 20
    elif ratio > 0.5:
        score -= 10

    if len(data) < 5:
        score -= 10

    return max(score, 0)
