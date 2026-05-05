// Central types for the Energy Drink Oracle app
// Mirrors the SQLite reviews table schema exactly

export interface Review {
  id: number;
  image_filename: string;
  official_name: string;
  brand: string;
  type: string;
  user_taste_profile: string;
  official_flavor_notes: string;
  caffeine_amount_mg: number;
  rating: number;
  review_text: string;
  raw_text: string;
  sweetness_level: number;       // 1-5
  tartness_level: number;        // 1-5
  carbonation_level: number;     // 1-5
  artificial_sweetener_taste: number; // 1-5
  smoothness: number;            // 1-5
  refreshing_score: number;      // 1-5
  primary_flavor_category: string;
  secondary_flavor_category: string;
  sugar_free: boolean;
  functional_ingredients: string;
}

export interface ModelWeights {
  intercept: number;
  numeric_features: string[];
  numeric_means: number[];
  numeric_stds: number[];
  categorical_features: string[];
  categorical_categories: string[][];
  coefficients: number[];
  all_feature_names: string[];
  training_samples: number;
  brands: string[];
  flavor_categories: string[];
}

export interface UntriedDrink {
  id: string;
  name: string;
  brand: string;
  primary_flavor_category: string;
  sweetness_level: number;
  tartness_level: number;
  carbonation_level: number;
  artificial_sweetener_taste: number;
  smoothness: number;
  refreshing_score: number;
  sugar_free: boolean;
  caffeine_amount_mg: number;
  official_flavor_notes: string;
}

export interface PredictorInputs {
  sweetness_level: number;
  tartness_level: number;
  carbonation_level: number;
  artificial_sweetener_taste: number;
  smoothness: number;
  refreshing_score: number;
  sugar_free: boolean;
  primary_flavor_category: string;
  brand: string;
}
