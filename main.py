import csv


def add_transaction():
    amount = input("Enter amount: ")
    category = input("Enter category (food, rent, etc): ")
    type_ = input("Type (income/expense): ").strip().lower()

    with open("data.csv", mode="a", newline="") as file:
        writer = csv.writer(file)
        writer.writerow([amount, category, type_])

    print("Transaction added successfully.\n")


def view_transactions():
    try:
        with open("data.csv", mode="r") as file:
            reader = csv.reader(file)

            print("\nTransactions:")

            for i, row in enumerate(reader):
                # Skip header safely
                if i == 0 and row == ["amount", "category", "type"]:
                    continue

                if len(row) < 3:
                    continue

                print(f"Amount: {row[0]}, Category: {row[1]}, Type: {row[2]}")

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
                if i == 0 and row == ["amount", "category", "type"]:
                    continue
                if len(row) < 3:
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
        print(f"\nTotal Income: {total_income}")
        print(f"Total Expense: {total_expense}")
        print(f"Balance: {balance}\n")

    except FileNotFoundError:
        print("No data found.\n")


def main():
    while True:
        print("1. Add Transaction")
        print("2. View Transactions")
        print("3. Show Balance")
        print("4. Exit")

        choice = input("Choose an option: ").strip()

        if choice == "1":
            add_transaction()
        elif choice == "2":
            view_transactions()
        elif choice == "3":
            calculate_balance()
        elif choice == "4":
            print("Goodbye!")
            break
        else:
            print("Invalid choice\n")


if __name__ == "__main__":
    main()
