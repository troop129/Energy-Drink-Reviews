import { promises as fs } from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { Review } from '@/lib/types';
import DatabaseClient from '@/components/DatabaseClient';

export const metadata: Metadata = {
  title: 'Database Explorer | Ultra-Zap Reviews',
  description: 'Browse, filter, and search all 38 energy drink reviews in the comic-panel database.',
};

export default async function DatabasePage() {
  const reviewsPath = path.join(process.cwd(), 'public', 'data', 'reviews.json');
  const reviews: Review[] = JSON.parse(await fs.readFile(reviewsPath, 'utf-8'));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <DatabaseClient reviews={reviews} />
    </div>
  );
}
