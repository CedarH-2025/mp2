import { useEffect, useState } from 'react';
import { loadMealCollection, type MealCollection } from '../services/mealApi';

export default function useMeals() {
  const [collection, setCollection] = useState<MealCollection>({ meals: [], source: 'api' });
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadMealCollection().then((result) => {
      if (active) {
        setCollection(result);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [attempt]);

  return { ...collection, loading, retry: () => setAttempt((value) => value + 1) };
}
