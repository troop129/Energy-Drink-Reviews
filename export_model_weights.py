import sqlite3
import json
import os
import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

DB_PATH = "energy_drinks.db"
OUT_PATH = "energy-drink-oracle/public/data/model_weights.json"

NUMERIC_FEATURES = [
    'sweetness_level', 'tartness_level', 'carbonation_level',
    'artificial_sweetener_taste', 'smoothness', 'refreshing_score', 'sugar_free'
]
CATEGORICAL_FEATURES = ['primary_flavor_category', 'brand']
TARGET = 'rating'

def train_and_export():
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql('SELECT * FROM reviews', conn)
    conn.close()

    df = df[df[TARGET] > 0.0]

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES].copy()
    y = df[TARGET]

    X.fillna({
        'sweetness_level': 3, 'tartness_level': 2, 'carbonation_level': 3,
        'artificial_sweetener_taste': 2, 'smoothness': 3, 'refreshing_score': 3,
        'sugar_free': 1, 'primary_flavor_category': 'Other', 'brand': 'Unknown'
    }, inplace=True)

    scaler = StandardScaler()
    encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)

    preprocessor = ColumnTransformer(transformers=[
        ('num', scaler, NUMERIC_FEATURES),
        ('cat', encoder, CATEGORICAL_FEATURES),
    ])

    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', Ridge(alpha=1.0))
    ])

    model.fit(X, y)

    # Extract fitted components
    fitted_scaler = model.named_steps['preprocessor'].named_transformers_['num']
    fitted_encoder = model.named_steps['preprocessor'].named_transformers_['cat']
    reg = model.named_steps['regressor']

    # Get all feature names for reporting
    cat_feature_names = fitted_encoder.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
    all_features = NUMERIC_FEATURES + cat_feature_names
    coefs = reg.coef_.tolist()

    # Print top drivers
    paired = sorted(zip(all_features, coefs), key=lambda x: abs(x[1]), reverse=True)
    print("\n--- Top Taste Drivers ---")
    for feat, coef in paired[:10]:
        print(f"  {feat:<40} {coef:+.4f}")

    weights = {
        "intercept": float(reg.intercept_),
        "numeric_features": NUMERIC_FEATURES,
        "numeric_means": fitted_scaler.mean_.tolist(),
        "numeric_stds": fitted_scaler.scale_.tolist(),
        "categorical_features": CATEGORICAL_FEATURES,
        "categorical_categories": [cats.tolist() for cats in fitted_encoder.categories_],
        "coefficients": coefs,
        "all_feature_names": all_features,
        "training_samples": len(df),
        "brands": sorted(df['brand'].dropna().unique().tolist()),
        "flavor_categories": sorted(df['primary_flavor_category'].dropna().unique().tolist()),
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(weights, f, indent=2)

    print(f"\nModel weights exported to {OUT_PATH}")
    print(f"Intercept: {weights['intercept']:.4f}")
    print(f"Trained on {weights['training_samples']} drinks")

if __name__ == "__main__":
    train_and_export()
