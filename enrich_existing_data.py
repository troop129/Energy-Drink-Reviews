import sqlite3
import os
import argparse
from pydantic import BaseModel, Field
from openai import OpenAI
from duckduckgo_search import DDGS
from dotenv import load_dotenv
import time

load_dotenv()

class TasteProfileEnrichment(BaseModel):
    sweetness_level: int = Field(description="How sweet the drink is generally considered (1 = not very sweet, 5 = extremely sweet/candy-like)")
    tartness_level: int = Field(description="How sour/tart the drink is (1 = not tart, 5 = very tart/sour)")
    carbonation_level: int = Field(description="How carbonated it is (1 = flat/tea/juice-like, 5 = very high carbonation)")
    artificial_sweetener_taste: int = Field(description="How prominent the artificial aftertaste is (1 = none, 5 = very strong)")
    smoothness: int = Field(description="How smooth the drink goes down vs harsh or syrupy (1 = harsh/syrupy, 5 = very smooth)")
    refreshing_score: int = Field(description="Is it light/refreshing (5) or heavy/dessert-like (1)")
    primary_flavor_category: str = Field(description="The primary flavor category (e.g., Citrus, Berry, Tropical, Candy, Dessert, Cola, Tea, Coffee)")
    secondary_flavor_category: str = Field(description="The secondary flavor category, if applicable. If none, output 'None'")
    sugar_free: bool = Field(description="True if zero sugar, False otherwise")
    functional_ingredients: str = Field(description="A comma-separated list of added functional elements (e.g., Nootropics, BCAAs, Electrolytes). If none, output 'None'")

def add_columns_if_not_exist(cursor):
    new_columns = {
        "sweetness_level": "INTEGER",
        "tartness_level": "INTEGER",
        "carbonation_level": "INTEGER",
        "artificial_sweetener_taste": "INTEGER",
        "smoothness": "INTEGER",
        "refreshing_score": "INTEGER",
        "primary_flavor_category": "TEXT",
        "secondary_flavor_category": "TEXT",
        "sugar_free": "BOOLEAN",
        "functional_ingredients": "TEXT"
    }
    
    cursor.execute("PRAGMA table_info(reviews)")
    existing_columns = [col[1] for col in cursor.fetchall()]
    
    for col_name, col_type in new_columns.items():
        if col_name not in existing_columns:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE reviews ADD COLUMN {col_name} {col_type}")

def search_web(query, num_results=3):
    print(f"  Searching web for: {query}")
    try:
        results = []
        with DDGS() as ddgs:
            # Get text results
            responses = ddgs.text(query, max_results=num_results)
            for r in responses:
                results.append(f"Source: {r.get('title')}\nSnippet: {r.get('body')}")
        return "\n\n".join(results)
    except Exception as e:
        print(f"  Web search failed: {e}")
        return "No web search context available."

def extract_taste_profile(client, model_name, brand, name, type_val, review_text, web_context):
    print(f"  Testing model: {model_name}")
    start_time = time.time()
    try:
        response = client.beta.chat.completions.parse(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert energy drink sommelier. Your job is to extract or infer specific taste profile metrics about a drink. Use the user's review and the web search context provided to make the most accurate assessment. If something is unknown, make your best educated guess based on the brand, name, and typical industry standards for this type of drink."
                },
                {
                    "role": "user",
                    "content": f"""
Please extract the taste profile for this drink:
Brand: {brand}
Name: {name}
Type: {type_val}
User Review: {review_text}

---
Web Search Context:
{web_context}
"""
                }
            ],
            response_format=TasteProfileEnrichment,
        )
        duration = time.time() - start_time
        result = response.choices[0].message.parsed
        print(f"    Success ({duration:.2f}s): {result.primary_flavor_category}, Sweetness: {result.sweetness_level}")
        return result
    except Exception as e:
        duration = time.time() - start_time
        print(f"    Error with model {model_name} ({duration:.2f}s): {e}")
        return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="energy_drinks.db", help="Path to database")
    parser.add_argument("--models", nargs="+", default=["gpt-5.4-mini", "gpt-5.4-nano"], help="List of OpenAI models to test")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of rows to process (for testing)")
    args = parser.parse_args()

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    conn = sqlite3.connect(args.db)
    cursor = conn.cursor()
    
    add_columns_if_not_exist(cursor)
    conn.commit()
    
    # Fetch rows that need enrichment
    cursor.execute("SELECT id, official_name, brand, type, review_text FROM reviews WHERE sweetness_level IS NULL")
    rows = cursor.fetchall()
    
    print(f"Found {len(rows)} drinks needing enrichment.")
    
    processed_count = 0
    for row in rows:
        if args.limit > 0 and processed_count >= args.limit:
            break
            
        row_id, name, brand, type_val, review_text = row
        print(f"\nProcessing ID {row_id}: {brand} {name}")
        
        # 1. Search the web
        query = f"{brand} {name} energy drink flavor profile review"
        web_context = search_web(query)
        
        # 2. Test models and get result
        best_result = None
        for model in args.models:
            result = extract_taste_profile(client, model, brand, name, type_val, review_text, web_context)
            if result is not None and best_result is None:
                # We'll use the first successful model's result for the DB
                best_result = result
        
        if best_result:
            cursor.execute('''
                UPDATE reviews 
                SET sweetness_level=?, tartness_level=?, carbonation_level=?, artificial_sweetener_taste=?, 
                    smoothness=?, refreshing_score=?, primary_flavor_category=?, secondary_flavor_category=?, 
                    sugar_free=?, functional_ingredients=?
                WHERE id=?
            ''', (
                best_result.sweetness_level, best_result.tartness_level, best_result.carbonation_level,
                best_result.artificial_sweetener_taste, best_result.smoothness, best_result.refreshing_score,
                best_result.primary_flavor_category, best_result.secondary_flavor_category,
                best_result.sugar_free, best_result.functional_ingredients, row_id
            ))
            conn.commit()
            print(f"  Successfully updated DB for {name}.")
        else:
            print(f"  Failed to enrich {name} using any of the provided models.")
            
        processed_count += 1
        
    conn.close()
    print("\nEnrichment complete.")

if __name__ == "__main__":
    main()
