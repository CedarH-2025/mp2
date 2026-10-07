import { useEffect, useState } from 'react';
import { loadCategories, loadGalleryMeals } from '../services/mealApi';
import type { GalleryMeal } from '../types/meal';

export default function useGalleryMeals(selected: string[]) {
  const key = JSON.stringify([...selected].sort());
  const [attempt, setAttempt] = useState(0);
  const [options, setOptions] = useState<{ categories: string[]; source: 'api' | 'sample' }>({ categories: ['Beef'], source: 'api' });
  const [result, setResult] = useState<{ key: string; attempt: number; meals: GalleryMeal[]; source: 'api' | 'sample' } | null>(null);

  useEffect(() => {
    let active = true;
    loadCategories().then((data) => { if (active) setOptions(data); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    const categories: string[] = JSON.parse(key);
    if (!categories.length) return;
    let active = true;
    loadGalleryMeals(categories).then((data) => {
      if (active) setResult({ ...data, key, attempt });
    });
    return () => { active = false; };
  }, [key, attempt]);

  const current = result?.key === key && result.attempt === attempt;
  return {
    categories: options.categories,
    meals: selected.length && current ? result.meals : [],
    loading: selected.length > 0 && !current,
    usingSamples: selected.length > 0 && current && result.source === 'sample',
    categoryFallback: options.source === 'sample',
    retry: () => setAttempt((value) => value + 1),
  };
}
