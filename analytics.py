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
    monthly_expense = {}

    for row in data:
        amount = row["amount"]

        if row["type"] == "income":
            income += amount
        else:
            expense += amount

            month = row["date"][:7]
            monthly_expense[month] = monthly_expense.get(month, 0) + amount

    if income == 0:
        return 0

    ratio = expense / income

    # 1. Spending ratio - how much of their income is being spent
    if ratio > 1:
        score -= 40
    elif ratio > 0.8:
        score -= 25
    elif ratio > 0.6:
        score -= 15

    # 2. Savings strength - how much they are saving compared to their income
    savings = income - expense
    if savings < income * 0.2:
        score -= 15
    elif savings < income * 0.1:
        score -= 25

    # 3. Consistency (monthly variation) - how stable their spending is
    if len(monthly_expense) >= 3:
        values = list(monthly_expense.values())
        avg = sum(values) / len(values)

        max_diff = max(abs(v - avg) for v in values)

        if max_diff > avg * 0.5:
            score -= 10

    # 4. Data reliability - if they have very little data, the score should be lower since we can't be sure about their habits
    if len(data) < 5:
        score -= 10

    return max(score, 0)


def analyze_budget(data, budgets):
    results = []

    category_expense = {}

    for row in data:
        if row["type"] != "expense":
            continue

        category = row["category"]
        amount = row["amount"]

        category_expense[category] = category_expense.get(category, 0) + amount

    for category, limit in budgets.items():
        spent = category_expense.get(category, 0)

        if spent > limit:
            results.append(f"You exceeded your {category} budget by {spent - limit}.")
        elif spent > limit * 0.8:
            results.append(f"You are close to your {category} budget.")
        else:
            results.append(f"You are within your {category} budget.")

    return results

def category_trends(data):
    trends = []

    monthly_category = {}

    for row in data:
        if row["type"] != "expense":
            continue

        month = row["date"][:7]
        category = row["category"]
        amount = row["amount"]

        if month not in monthly_category:
            monthly_category[month] = {}

        monthly_category[month][category] = (
            monthly_category[month].get(category, 0) + amount
        )

    months = sorted(monthly_category.keys())

    if len(months) < 2:
        return trends

    last_month = months[-1]
    prev_month = months[-2]

    last_data = monthly_category[last_month]
    prev_data = monthly_category[prev_month]

    all_categories = set(last_data.keys()) | set(prev_data.keys())

    for category in all_categories:
        last_value = last_data.get(category, 0)
        prev_value = prev_data.get(category, 0)

        if prev_value == 0:
            continue

        change = ((last_value - prev_value) / prev_value) * 100

        if change > 5:
            trends.append(f"{category} spending increased by {change:.1f}%")
        elif change < -5:
            trends.append(f"{category} spending decreased by {abs(change):.1f}%")
        else:
            trends.append(f"{category} spending stayed about the same")

    return trends
