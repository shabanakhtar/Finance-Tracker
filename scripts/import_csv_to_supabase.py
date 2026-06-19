import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from settings import env  # noqa: E402
from supabase_data import add_transaction, require_user_id  # noqa: E402


def main():
    user_id = require_user_id(env("FINANCE_DEMO_USER_ID"))
    csv_path = ROOT / "data.csv"

    imported = 0
    skipped = 0

    with csv_path.open(newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            try:
                add_transaction(
                    row["amount"],
                    row["category"],
                    row["type"],
                    row["date"],
                    user_id,
                )
                imported += 1
            except Exception:
                skipped += 1

    print(f"Imported {imported} transactions. Skipped {skipped}.")


if __name__ == "__main__":
    main()
