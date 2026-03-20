import csv

def add_transaction():
    amount = input("Enter amount: ")
    category = input("Enter category (food, rent, etc): ")
    type_ = input("Type (income/expense): ")

    with open("data.csv", mode="a", newline="") as file:
        writer = csv.writer(file)
        writer.writerow([amount, category, type_])

    print("Transaction added successfully.\n")


def view_transactions():
    try:
        with open("data.csv", mode="r") as file:
            reader = csv.reader(file)
            print("\nTransactions:")
            for row in reader:
                print(f"Amount: {row[0]}, Category: {row[1]}, Type: {row[2]}")
            print()
    except FileNotFoundError:
        print("No transactions found.\n")


def main():
    while True:
        print("1. Add Transaction")
        print("2. View Transactions")
        print("3. Exit")

        choice = input("Choose an option: ")

        if choice == "1":
            add_transaction()
        elif choice == "2":
            view_transactions()
        elif choice == "3":
            print("Goodbye!")
            break
        else:
            print("Invalid choice\n")


if __name__ == "__main__":
    main()