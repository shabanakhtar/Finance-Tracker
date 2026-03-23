import csv
import os
from dotenv import load_dotenv
from google import genai
from data import load_data, add_transaction
from analytics import calculate_balance, category_summary, monthly_summary, top_categories, expense_breakdown
from budget import set_budget, check_budget
from ai import ask_ai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


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


def get_overall_summary():
    data = load_data()

    total_income = 0
    total_expense = 0

    for row in data:
        if row["type"] == "income":
            total_income += row["amount"]
        else:
            total_expense += row["amount"]

    return {
        "income": total_income,
        "expense": total_expense,
        "balance": total_income - total_expense
    }



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
        print("9. Ask AI")
        print("10. Exit")

        choice = input("Choose an option: ").strip()

        if choice == "1":
            add_transaction()
        elif choice == "2":
            view_transactions()

        if choice == "3":
            summary = calculate_balance()

            print("\nFinancial Summary:")
            print(f"Income: {summary['income']}")
            print(f"Expense: {summary['expense']}")
            print(f"Balance: {summary['balance']}\n")

        elif choice == "4":
            summary = category_summary()

            print("\nCategory Summary:")
            for category, data in summary.items():
                print(f"{category} -> income: {data['income']} | expense: {data['expense']}")

            check_budget(summary)
            print()

        elif choice == "5":
            set_budget()

        elif choice == "6":
            summary = monthly_summary()

            print("\nMonthly Summary:")
            for m, data in summary.items():
                print(f"{m} -> income: {data['income']} | expense: {data['expense']}")
            print()

        elif choice == "7":
            top = top_categories()

            print("\nTop Spending Categories:")
            for cat, val in top:
                print(f"{cat}: {val}")
            print()

        elif choice == "8":
            breakdown = expense_breakdown()

            print("\nExpense Breakdown (%):")
            for cat, percent in breakdown.items():
                print(f"{cat}: {percent:.2f}%")
            print()

        elif choice == "9":
            data = load_data()
            user_input = input("Ask AI: ")

            response = ask_ai(user_input, data)

            print("\nAI Response:")
            print(response)
            print()
            
        elif choice == "10":
            print("Goodbye!")
            break
        else:
            print("Invalid choice\n")


if __name__ == "__main__":
    main()
