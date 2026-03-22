import csv

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
    category = input("Enter category: ").strip().lower()
    type_ = input("Type (income/expense): ").strip().lower()
    date = input("Enter date (YYYY-MM-DD): ")

    with open("data.csv", mode="a", newline="") as file:
        writer = csv.writer(file)
        writer.writerow([amount, category, type_, date])

    print("Transaction added.\n")