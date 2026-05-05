import { promises as fs } from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { Review } from '@/lib/types';
import StatsClient from '@/components/StatsClient';

export const metadata: Metadata = {
  title: 'The Stats Lab | Ultra-Zap Reviews',
  description: 'Data visualizations and analysis of all 38 energy drink reviews.',
};

export default async function StatsPage() {
  const reviewsPath = path.join(process.cwd(), 'public', 'data', 'reviews.json');
  const reviews: Review[] = JSON.parse(await fs.readFile(reviewsPath, 'utf-8'));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <StatsClient reviews={reviews} />
    </div>
  );
}
