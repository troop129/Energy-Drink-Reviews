from sklearn.linear_model import Ridge
import sqlite3
import pandas as pd
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import argparse
from pydantic import BaseModel, Field
import os
import warnings
from openai import OpenAI
from duckduckgo_search import DDGS
from dotenv import load_dotenv

# Suppress DDGS warnings
warnings.filterwarnings("ignore", category=RuntimeWarning, module="duckduckgo_search")
load_dotenv()

class TasteProfileEnrichment(BaseModel):
    sweetness_level: int = Field(description="How sweet the drink is generally considered (1 = not very sweet, 5 = extremely sweet/candy-like)")
    tartness_level: int = Field(description="How sour/tart the drink is (1 = not tart, 5 = very tart/sour)")
    carbonation_level: int = Field(description="How carbonated it is (1 = flat/tea/juice-like, 5 = very high carbonation)")
    artificial_sweetener_taste: int = Field(description="How prominent the artificial aftertaste is (1 = none, 5 = very strong)")
    smoothness: int = Field(description="How smooth the drink goes down vs harsh or syrupy (1 = harsh/syrupy, 5 = very smooth)")
    refreshing_score: int = Field(description="Is it light/refreshing (5) or heavy/dessert-like (1)")
    primary_flavor_category: str = Field(description="The primary flavor category (e.g., Fruit, Citrus, Berry, Tropical, Candy, Dessert, Cola, Tea)")
    sugar_free: bool = Field(description="True if zero sugar, False otherwise")

def train_model(db_path="energy_drinks.db"):
    conn = sqlite3.connect(db_path)
    df = pd.read_sql('SELECT * FROM reviews', conn)
    conn.close()
    
    # Filter out rows with 0.0 rating if that means unrated
    df = df[df['rating'] > 0.0]
    
    if len(df) < 5:
        print("Not enough rated drinks to train a reliable model.")
        return None, None
        
    features = [
        'sweetness_level', 'tartness_level', 'carbonation_level', 
        'artificial_sweetener_taste', 'smoothness', 'refreshing_score',
        'sugar_free', 'primary_flavor_category', 'brand'
    ]
    target = 'rating'
    
    X = df[features].copy()
    y = df[target]
    
    # Fill any NaNs
    X.fillna({
        'sweetness_level': 3,
        'tartness_level': 2,
        'carbonation_level': 3,
        'artificial_sweetener_taste': 2,
        'smoothness': 3,
        'refreshing_score': 3,
        'sugar_free': 1,
        'primary_flavor_category': 'Other',
        'brand': 'Unknown'
    }, inplace=True)
    
    numeric_features = ['sweetness_level', 'tartness_level', 'carbonation_level', 
                        'artificial_sweetener_taste', 'smoothness', 'refreshing_score', 'sugar_free']
    categorical_features = ['primary_flavor_category', 'brand']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
        
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', Ridge(alpha=1.0))
    ])
    
    model.fit(X, y)
    
    print(f"Model trained on {len(df)} rated drinks.")
    
    # Feature importance/coefficients
    reg = model.named_steps['regressor']
    cat_encoder = model.named_steps['preprocessor'].named_transformers_['cat']
    cat_features = cat_encoder.get_feature_names_out(categorical_features)
    all_features = numeric_features + list(cat_features)
    
    importances = reg.coef_
    feature_importance = pd.DataFrame({'feature': all_features, 'coefficient': importances})
    # Sort by absolute value to show strongest drivers (positive or negative)
    feature_importance['abs_coef'] = feature_importance['coefficient'].abs()
    feature_importance = feature_importance.sort_values('abs_coef', ascending=False).drop('abs_coef', axis=1)
    
    print("\n--- Top Factors Influencing Your Taste Profile ---")
    print("(Positive number = increases rating, Negative = decreases rating)")
    for idx, row in feature_importance.head(10).iterrows():
        print(f"{row['feature']:<30} {row['coefficient']:+.4f}")
    print("-------------------------------------------------\n")
    
    return model, features

def search_web(query, num_results=3):
    try:
        results = []
        with DDGS() as ddgs:
            responses = ddgs.text(query, max_results=num_results)
            for r in responses:
                results.append(f"Source: {r.get('title')}\nSnippet: {r.get('body')}")
        return "\n\n".join(results)
    except Exception:
        return "No web context available."

def predict_new_drink(model, brand, name):
    print(f"Predicting rating for: {brand} {name}...")
    
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    web_context = search_web(f"{brand} {name} energy drink flavor profile review")
    
    print("Extracting features via LLM...")
    response = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are an expert energy drink sommelier. Extract specific taste profile metrics about a drink. Use the web search context provided to make an accurate assessment."
            },
            {
                "role": "user",
                "content": f"Drink: {brand} {name}\nWeb Context:\n{web_context}"
            }
        ],
        response_format=TasteProfileEnrichment,
    )
    
    result = response.choices[0].message.parsed
    
    # Create a dataframe for the new drink
    new_data = {
        'sweetness_level': [result.sweetness_level],
        'tartness_level': [result.tartness_level],
        'carbonation_level': [result.carbonation_level],
        'artificial_sweetener_taste': [result.artificial_sweetener_taste],
        'smoothness': [result.smoothness],
        'refreshing_score': [result.refreshing_score],
        'sugar_free': [int(result.sugar_free)],
        'primary_flavor_category': [result.primary_flavor_category],
        'brand': [brand]
    }
    
    new_df = pd.DataFrame(new_data)
    
    print("\n--- Extracted Profile ---")
    for k, v in new_data.items():
        print(f"{k:<30}: {v[0]}")
    
    prediction = model.predict(new_df)[0]
    print("\n=========================================")
    print(f"Predicted Rating for {brand} {name}: {prediction:.1f}/10")
    print("=========================================\n")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--predict", nargs=2, metavar=('BRAND', 'NAME'), help="Predict rating for a new drink (e.g. 'Ghost' 'Swedish Fish')")
    args = parser.parse_args()
    
    model, features = train_model()
    
    if args.predict and model is not None:
        predict_new_drink(model, args.predict[0], args.predict[1])

if __name__ == "__main__":
    main()
