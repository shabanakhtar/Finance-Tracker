# Simple analytics functions for financial data
MIN_TRANSACTIONS = 5
WEEKDAY_THRESHOLD = 1.3
CONSISTENCY_THRESHOLD = 0.2
MIN_TREND_PERCENT = 5
PEAK_DAY_LABEL_MIN = 5

# Helper function: get category totals (for expenses or income)
def get_category_totals(data, expense_only=True):
    totals = {}
    for row in data:
        if expense_only and row["type"] != "expense":
            continue
        category = row["category"]
        totals[category] = totals.get(category, 0) + row["amount"]
    return totals

# Helper function: get monthly totals (for expenses or income)
def get_monthly_totals(data, expense_only=True):
    totals = {}
    for row in data:
        if expense_only and row["type"] != "expense":
            continue
        month = row["date"][:7]
        totals[month] = totals.get(month, 0) + row["amount"]
    return totals

# Helper function: organize expenses by month and category
def get_category_monthly_data(data):
    monthly_category = {}
    for row in data:
        if row["type"] != "expense":
            continue
        month = row["date"][:7]
        category = row["category"]
        amount = row["amount"]
        if month not in monthly_category:
            monthly_category[month] = {}
        monthly_category[month][category] = monthly_category[month].get(category, 0) + amount
    return monthly_category

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
    
    # Checking for month-over-month changes
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

    # Checking for category patterns - if one category is much higher than average, it could indicate a new habit or issue(anomaly)
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
        score -= 20
    elif ratio > 0.6:
        score -= 10

    # 2. Consistency - how stable their spending is month to month
    if len(monthly_expense) >= 3:
        values = list(monthly_expense.values())
        avg = sum(values) / len(values)
        max_diff = max(abs(v - avg) for v in values)
        if max_diff > avg * 0.5:
            score -= 10

    # 3. To check data reliability
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


def spending_by_weekday(data):
    habits = []
    
    if len(data) < MIN_TRANSACTIONS:
        return habits
    
    # Simple frequency-based pattern: first half vs second half of month
    first_half = 0
    second_half = 0
    
    for row in data:
        if row["type"] != "expense":
            continue
        day = int(row["date"].split("-")[2])
        if day <= 15:
            first_half += row["amount"]
        else:
            second_half += row["amount"]
    
    if first_half > 0 and second_half > 0:
        if second_half > first_half * WEEKDAY_THRESHOLD:
            habits.append("You spend more in the second half of the month")
        elif first_half > second_half * WEEKDAY_THRESHOLD:
            habits.append("You spend more in the first half of the month")
    
    return habits


def detect_recurring_expenses(data):
    recurring = []
    
    if len(data) < MIN_TRANSACTIONS:
        return recurring
    
    # Organize by category first, then by month
    category_monthly = {}
    for row in data:
        category = row["category"]
        month = row["date"][:7]
        amount = row["amount"]
        if category not in category_monthly:
            category_monthly[category] = {}
        category_monthly[category][month] = category_monthly[category].get(month, 0) + amount
    
    for category, monthly_data in category_monthly.items():
        months = sorted(monthly_data.keys())
        if len(months) < 2:
            continue
        
        amounts = [monthly_data[m] for m in months]
        avg = sum(amounts) / len(amounts)
        
        # Check if consistent (within tolerance)
        consistent = sum(1 for amt in amounts if abs(amt - avg) / max(avg, 1) <= CONSISTENCY_THRESHOLD)
        
        if consistent >= 2:
            recurring.append(f"{category} (monthly avg {avg:.2f})")
    
    return recurring


def detect_top_trends(data):
    results = []
    
    if len(data) < MIN_TRANSACTIONS:
        return results
    
    monthly_category = get_category_monthly_data(data)
    months = sorted(monthly_category.keys())
    
    if len(months) < 2:
        return results
    
    last = months[-1]
    prev = months[-2]
    
    max_up = None
    max_up_pct = 0
    max_down = None
    max_down_pct = 0
    
    for category in set(monthly_category[last].keys()) | set(monthly_category[prev].keys()):
        last_amt = monthly_category[last].get(category, 0)
        prev_amt = monthly_category[prev].get(category, 0)
        
        if prev_amt == 0:
            continue
        
        pct = ((last_amt - prev_amt) / prev_amt) * 100
        
        if pct > max_up_pct:
            max_up_pct = pct
            max_up = category
        
        if pct < max_down_pct:
            max_down_pct = pct
            max_down = category
    
    if max_up and max_up_pct > MIN_TREND_PERCENT:
        results.append(f"{max_up} trending up ({max_up_pct:.1f}%)")
    
    if max_down and max_down_pct < -MIN_TREND_PERCENT:
        results.append(f"{max_down} trending down ({abs(max_down_pct):.1f}%)")
    
    return results


def calculate_savings_rate(data):
    insights = []
    
    total_income = 0
    total_expense = 0
    
    for row in data:
        if row["type"] == "income":
            total_income += row["amount"]
        elif row["type"] == "expense":
            total_expense += row["amount"]
    
    if total_income == 0:
        return insights
    
    savings = total_income - total_expense
    savings_rate = (savings / total_income) * 100
    
    if savings_rate < 0:
        insights.append(f"Spending more than earning (deficit {abs(savings_rate):.1f}%)")
    elif savings_rate < 10:
        insights.append(f"Low savings rate ({savings_rate:.1f}%) - reduce expenses")
    elif savings_rate > 30:
        insights.append(f"Good savings rate ({savings_rate:.1f}%)")
    
    return insights


def generate_smart_warnings(data, budgets):
    warnings = []
    
    if len(data) < MIN_TRANSACTIONS:
        return warnings
    
    category_expense = get_category_totals(data)
    monthly_category = get_category_monthly_data(data)
    
    # Warning 1: Over budget
    over_budget = 0
    for category, limit in budgets.items():
        if category_expense.get(category, 0) > limit:
            over_budget += 1
    
    if over_budget > 1:
        warnings.append("Multiple categories over budget")
    
    # Warning 2: Approaching budget limits
    approaching = 0
    for category, limit in budgets.items():
        spent = category_expense.get(category, 0)
        if 0.8 * limit <= spent <= limit:
            approaching += 1
    
    if approaching >= 2:
        warnings.append("Several categories approaching limits")
    
    # Warning 3: Increasing spending trends
    if len(monthly_category) >= 2:
        months = sorted(monthly_category.keys())
        last = months[-1]
        prev = months[-2]
        
        last_total = sum(monthly_category[last].values())
        prev_total = sum(monthly_category[prev].values())
        
        if prev_total > 0:
            change = ((last_total - prev_total) / prev_total) * 100
            if change > 15:
                warnings.append(f"Spending up significantly ({change:.1f}%) this month")
    
    # Warning 4: Low savings rate
    savings_warnings = calculate_savings_rate(data)
    warnings.extend(savings_warnings)
    
    return warnings
