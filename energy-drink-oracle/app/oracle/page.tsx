import { promises as fs } from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { Review, ModelWeights, UntriedDrink } from '@/lib/types';
import OracleClient from '@/components/OracleClient';

export const metadata: Metadata = {
  title: 'The Oracle Predictor | Ultra-Zap Reviews',
  description: 'Predict your rating for any energy drink using Ridge Regression machine learning.',
};

export default async function OraclePage() {
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const [reviews, weights, untriedDrinks]: [Review[], ModelWeights, UntriedDrink[]] = await Promise.all([
    fs.readFile(path.join(dataDir, 'reviews.json'), 'utf-8').then(JSON.parse),
    fs.readFile(path.join(dataDir, 'model_weights.json'), 'utf-8').then(JSON.parse),
    fs.readFile(path.join(dataDir, 'untried_drinks.json'), 'utf-8').then(JSON.parse),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <OracleClient reviews={reviews} weights={weights} untriedDrinks={untriedDrinks} />
    </div>
  );
}
