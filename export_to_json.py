import sqlite3
import json
import os

DB_PATH = "energy_drinks.db"
OUT_PATH = "energy-drink-oracle/public/data/reviews.json"

def export_reviews():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reviews ORDER BY id")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # Normalize types
    for row in rows:
        row['sugar_free'] = bool(row['sugar_free'])
        row['rating'] = float(row['rating']) if row['rating'] is not None else 0.0
        row['caffeine_amount_mg'] = int(row['caffeine_amount_mg']) if row['caffeine_amount_mg'] else 0

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(rows, f, indent=2)

    print(f"Exported {len(rows)} reviews to {OUT_PATH}")

if __name__ == "__main__":
    export_reviews()
