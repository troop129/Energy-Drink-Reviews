import os
import sqlite3
import base64
from pathlib import Path
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Define Pydantic model for structured extraction
class EnergyDrinkReview(BaseModel):
    official_name: str = Field(description="The standardized, official name of the energy drink")
    brand: str = Field(description="The brand of the energy drink (e.g., 'Monster', 'Celsius', 'Ghost')")
    drink_type: str = Field(description="Type of drink (e.g., 'Energy Drink', 'Pre-workout', 'Coffee')")
    user_taste_profile: str = Field(description="The user's flavor notes or taste profile as derived from their review text")
    official_flavor_notes: str = Field(description="The official intended flavor profile or tasting notes from the brand (use your knowledge of the drink). Output ONLY the concise flavor notes (e.g. 'Citrus and Berry'). Do not use conversational filler or phrases like 'Not specified in image' or 'It tastes like'. If completely unknown, output 'Unknown'.")
    caffeine_amount_mg: int = Field(description="The amount of caffeine in mg. Extract from text if present, otherwise infer from the drink's standard formulation, or 0 if unknown")
    rating: float = Field(description="The numerical rating given in the review, if any (out of 10 usually). If not present, use 0.0")
    review_text: str = Field(description="The actual text of the review written by the user in the image")
    raw_text: str = Field(description="All text found in the image")
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

def setup_database(db_path="energy_drinks.db"):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_filename TEXT UNIQUE,
            official_name TEXT,
            brand TEXT,
            type TEXT,
            user_taste_profile TEXT,
            official_flavor_notes TEXT,
            caffeine_amount_mg INTEGER,
            rating REAL,
            review_text TEXT,
            raw_text TEXT,
            sweetness_level INTEGER,
            tartness_level INTEGER,
            carbonation_level INTEGER,
            artificial_sweetener_taste INTEGER,
            smoothness INTEGER,
            refreshing_score INTEGER,
            primary_flavor_category TEXT,
            secondary_flavor_category TEXT,
            sugar_free BOOLEAN,
            functional_ingredients TEXT
        )
    ''')
    conn.commit()
    return conn

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def process_images(data_dir="data", db_path="energy_drinks.db"):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) 
    conn = setup_database(db_path)
    cursor = conn.cursor()
    
    image_paths = sorted(list(Path(data_dir).glob("*.PNG")) + list(Path(data_dir).glob("*.jpg")) + list(Path(data_dir).glob("*.png")))
    
    print(f"Found {len(image_paths)} images to process.")
    
    for path in image_paths:
        filename = path.name
        
        # Check if already processed
        cursor.execute("SELECT 1 FROM reviews WHERE image_filename = ?", (filename,))
        if cursor.fetchone():
            print(f"Skipping {filename}, already in database.")
            continue
            
        print(f"Processing {filename}...")
        
        try:
            base64_image = encode_image(path)
            
            response = client.beta.chat.completions.parse(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a data extraction assistant. Your job is to extract information from an image of an energy drink review. You need to identify the drink's official name, brand, type, the user's taste profile based on their text, the official flavor notes for this drink, and the caffeine amount in mg. Also extract the explicit numerical rating and the text of the review. Put all raw text you see in raw_text. NEVER use conversational filler in your fields. Just output the raw requested data."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract the details from this energy drink review screenshot."},
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                        ]
                    }
                ],
                response_format=EnergyDrinkReview,
            )
            
            result = response.choices[0].message.parsed
            
            cursor.execute('''
                INSERT INTO reviews (
                    image_filename, official_name, brand, type, user_taste_profile, official_flavor_notes, caffeine_amount_mg, rating, review_text, raw_text,
                    sweetness_level, tartness_level, carbonation_level, artificial_sweetener_taste, smoothness, refreshing_score, primary_flavor_category, secondary_flavor_category, sugar_free, functional_ingredients
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                filename, 
                result.official_name, 
                result.brand, 
                result.drink_type, 
                result.user_taste_profile, 
                result.official_flavor_notes,
                result.caffeine_amount_mg,
                result.rating, 
                result.review_text, 
                result.raw_text,
                result.sweetness_level,
                result.tartness_level,
                result.carbonation_level,
                result.artificial_sweetener_taste,
                result.smoothness,
                result.refreshing_score,
                result.primary_flavor_category,
                result.secondary_flavor_category,
                result.sugar_free,
                result.functional_ingredients
            ))
            conn.commit()
            print(f"Successfully added {filename} to database.")
            
        except Exception as e:
            print(f"Failed to process {filename}: {e}")
            
    conn.close()
    print("Done processing images.")

if __name__ == "__main__":
    # Ensure OPENAI_API_KEY is set
    if "OPENAI_API_KEY" not in os.environ:
        print("Error: OPENAI_API_KEY environment variable is not set.")
        print("Please set it using:")
        print("export OPENAI_API_KEY='your-key-here'")
        print("Then run: python process_reviews.py")
        exit(1)
        
    process_images()
