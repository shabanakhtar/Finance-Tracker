import csv

budgets = {}


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

    try:
        with open("data.csv", mode="r") as file:
            reader = csv.reader(file)

            for i, row in enumerate(reader):
                if i == 0 and row == ["amount", "category", "type", "date"]:
                    continue

                if len(row) < 4:
                    continue

                try:
                    amount = float(row[0])
                except ValueError:
                    continue

                type_ = row[2].strip().lower()

                if type_ == "income":
                    total_income += amount
                elif type_ == "expense":
                    total_expense += amount

        balance = total_income - total_expense

        print("\nFinancial Summary:")
        print(f"Total Income: {total_income}")
        print(f"Total Expense: {total_expense}")
        print(f"Balance: {balance}\n")

    except FileNotFoundError:
        print("No data found.\n")


def category_summary():
    summary = {}

    try:
        with open("data.csv", mode="r") as file:
            reader = csv.reader(file)

            for i, row in enumerate(reader):
                if i == 0 and row == ["amount", "category", "type", "date"]:
                    continue

                if len(row) < 4:
                    continue

                try:
                    amount = float(row[0])
                except ValueError:
                    continue

                category = row[1].strip().lower()
                type_ = row[2].strip().lower()

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

    except FileNotFoundError:
        print("No data found.\n")
        return {}


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


def main():
    while True:
        print("1. Add Transaction")
        print("2. View Transactions")
        print("3. Show Balance")
        print("4. Category Summary")
        print("5. Set Budget")
        print("6. Exit")

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
            print("Goodbye!")
            break
        else:
            print("Invalid choice\n")


if __name__ == "__main__":
    main()
