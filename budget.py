budgets = {}

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