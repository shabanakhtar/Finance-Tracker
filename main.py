import csv

budgets = {}


def load_data():
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
                    data.append({
                        "amount": float(row[0]),
                        "category": row[1].lower(),
                        "type": row[2].lower(),
                        "date": row[3]
                    })
                except:
                    continue

    except:
        pass

    return data


def add_transaction():
    amount = input("Enter amount: ")
    category = input("Enter category (food, rent, etc): ").strip().lower()
    type_ = input("Type (income/expense): ").strip().lower()
    date = input("Enter date (YYYY-MM-DD): ")

    with open("data.csv", mode="a", newline="") as file:
        writer = csv.writer(file)
        writer.writerow([amount, category, type_, date])

    print("Transaction added.\n")


def view_transactions():
    try:
        with open("data.csv", mode="r") as file:
            reader = csv.reader(file)

            print("\nTransactions:")

            for i, row in enumerate(reader):
                if i == 0 and row == ["amount", "category", "type", "date"]:
                    continue

                if len(row) < 4:
                    continue

                amount, category, type_, date = row
                print(f"{category} | {amount} | {type_} | {date}")

            print()

    except FileNotFoundError:
        print("No transactions found.\n")


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

    print("\nFinancial Summary:")
    print(f"Total Income: {total_income}")
    print(f"Total Expense: {total_expense}")
    print(f"Balance: {balance}\n")


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

    print("\nCategory Summary:")
    for category, data in summary.items():
        print(f"{category} -> income: {data['income']} | expense: {data['expense']}")
    print()

    return summary


def set_budget():
    category = input("Enter category: ").strip().lower()
    amount = float(input("Enter budget amount: "))

    budgets[category] = amount
    print("Budget saved.\n")


def check_budget(summary):
    print("\nBudget Status:")

    for category, data in summary.items():
        spent = data["expense"]

        if category in budgets:
            limit = budgets[category]

            if spent > limit:
                print(f"{category}: OVER by {spent - limit}")
            else:
                print(f"{category}: within budget")

    print()


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

    print("\nMonthly Summary:")
    for m, data in summary.items():
        print(f"{m} -> income: {data['income']} | expense: {data['expense']}")
    print()


def top_categories():
    totals = {}

    data = load_data()

    for row in data:
        if row["type"] != "expense":
            continue

        category = row["category"]
        amount = row["amount"]

        if category not in totals:
            totals[category] = 0

        totals[category] += amount

    sorted_totals = sorted(totals.items(), key=lambda x: x[1], reverse=True)

    print("\nTop Spending Categories:")
    for cat, val in sorted_totals[:3]:
        print(f"{cat}: {val}")
    print()


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

    if total_expense == 0:
        print("No expenses found.\n")
        return

    print("\nExpense Breakdown (%):")
    for cat, val in totals.items():
        percent = (val / total_expense) * 100
        print(f"{cat}: {percent:.2f}%")
    print()


def main():
    while True:
        print("1. Add Transaction")
        print("2. View Transactions")
        print("3. Show Balance")
        print("4. Category Summary")
        print("5. Set Budget")
        print("6. Monthly Summary")
        print("7. Top Spending")
        print("8. Expense Breakdown")
        print("9. Exit")

        choice = input("Choose an option: ").strip()

        if choice == "1":
            add_transaction()
        elif choice == "2":
            view_transactions()
        elif choice == "3":
            calculate_balance()
        elif choice == "4":
            summary = category_summary()
            check_budget(summary)
        elif choice == "5":
            set_budget()
        elif choice == "6":
            monthly_summary()
        elif choice == "7":
            top_categories()
        elif choice == "8":
            expense_breakdown()
        elif choice == "9":
            print("Goodbye!")
            break
        else:
            print("Invalid choice\n")


if __name__ == "__main__":
    main()
