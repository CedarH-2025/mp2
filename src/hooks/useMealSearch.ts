import { useEffect, useState } from 'react';
import { loadMealsByFirstLetter, type MealCollection } from '../services/mealApi';

export default function useMealSearch(query: string) {
  const firstLetter = query.trim().charAt(0).toLowerCase();
  const supported = /^[a-z]$/.test(firstLetter);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<MealCollection & { letter: string; attempt: number } | null>(null);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    loadMealsByFirstLetter(firstLetter).then((collection) => {
      if (active) setResult({ ...collection, letter: firstLetter, attempt });
    });
    return () => { active = false; };
  }, [firstLetter, supported, attempt]);

  // Hide an old response immediately when the first letter changes or input clears.
  const current = supported && result?.letter === firstLetter && result.attempt === attempt;
  return {
    meals: current ? result.meals : [],
    source: current ? result.source : 'api',
    loading: supported && !current,
    hasQuery: query.trim().length > 0,
    supported,
    retry: () => setAttempt((value) => value + 1),
  };
}
