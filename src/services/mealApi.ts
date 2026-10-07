import axios from 'axios';
import type { GalleryMeal, Meal, MealsResponse } from '../types/meal';
import { sampleMeals } from '../data/sampleMeals';

const mealApi = axios.create({
  baseURL: 'https://www.themealdb.com/api/json/v1/1/',
  timeout: 10000,
});

// API fields can be null even when the TypeScript view model expects strings.
export function normalizeMealsResponse(data: unknown): Meal[] {
  if (!data || typeof data !== 'object' || !('meals' in data)) throw new Error('Invalid meal response');
  if (data.meals === null) return [];
  if (!Array.isArray(data.meals)) throw new Error('Invalid meal response');
  return data.meals.map((item: unknown) => {
    if (!item || typeof item !== 'object' || !('idMeal' in item) || !('strMeal' in item)
        || typeof item.idMeal !== 'string' || typeof item.strMeal !== 'string') {
      throw new Error('Invalid meal item');
    }
    const raw = item as Record<string, unknown>;
    return {
      ...raw,
      idMeal: item.idMeal,
      strMeal: item.strMeal,
      strCategory: typeof raw.strCategory === 'string' && raw.strCategory.trim() ? raw.strCategory : 'Not specified',
      strArea: typeof raw.strArea === 'string' && raw.strArea.trim() ? raw.strArea : 'Not specified',
      strMealThumb: typeof raw.strMealThumb === 'string' ? raw.strMealThumb : '',
      strInstructions: typeof raw.strInstructions === 'string' ? raw.strInstructions : '',
    } as Meal;
  });
}

export async function searchMeals(query: string) {
  const response = await mealApi.get<MealsResponse>('search.php', {
    params: { s: query },
  });
  return normalizeMealsResponse(response.data);
}

export interface MealCollection {
  meals: import('../types/meal').Meal[];
  source: 'api' | 'sample';
}

const letterRequests = new Map<string, Promise<MealCollection>>();

export function loadMealsByFirstLetter(value: string): Promise<MealCollection> {
  const letter = value.trim().toLowerCase();
  // Blank and unsupported input must never trigger a network request.
  if (!/^[a-z]$/.test(letter)) return Promise.resolve({ meals: [], source: 'api' });
  const cached = letterRequests.get(letter);
  if (cached) return cached;
  const request = mealApi.get<MealsResponse>('search.php', { params: { f: letter } })
    .then((response): MealCollection => ({ meals: normalizeMealsResponse(response.data), source: 'api' }))
    .catch((): MealCollection => {
      letterRequests.delete(letter);
      return {
        meals: sampleMeals.filter((meal) => meal.strMeal.toLowerCase().startsWith(letter)),
        source: 'sample',
      };
    });
  letterRequests.set(letter, request);
  return request;
}

// Share one request across views and React StrictMode's repeated effects.
let collectionRequest: Promise<MealCollection> | undefined;

export function loadMealCollection(): Promise<MealCollection> {
  collectionRequest ??= searchMeals('')
    .then((meals): MealCollection => {
      if (meals.length === 0) throw new Error('No meals available');
      return { meals, source: 'api' };
    })
    .catch((): MealCollection => {
      // Allow a later page visit to try the API again after an outage.
      collectionRequest = undefined;
      return { meals: sampleMeals, source: 'sample' };
    });
  return collectionRequest;
}

export async function getMealById(id: string) {
  const response = await mealApi.get<MealsResponse>('lookup.php', {
    params: { i: id },
  });
  return normalizeMealsResponse(response.data)[0] ?? null;
}

const fallbackCategories = ['Beef', 'Breakfast', 'Chicken', 'Dessert', 'Goat', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork', 'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian'];
let categoriesRequest: Promise<{ categories: string[]; source: 'api' | 'sample' }> | undefined;

export function loadCategories() {
  categoriesRequest ??= mealApi.get('list.php', { params: { c: 'list' } })
    .then((response): { categories: string[]; source: 'api' | 'sample' } => {
      const items: unknown = response.data?.meals;
      if (!Array.isArray(items) || !items.length) throw new Error('Invalid categories');
      const categories = items.map((item: unknown) => {
        if (!item || typeof item !== 'object' || !('strCategory' in item)
            || typeof item.strCategory !== 'string' || !item.strCategory.trim()) throw new Error('Invalid category');
        return item.strCategory.trim();
      });
      return { categories: [...new Set(categories)].sort(), source: 'api' };
    })
    .catch((): { categories: string[]; source: 'api' | 'sample' } => {
      categoriesRequest = undefined;
      return { categories: fallbackCategories, source: 'sample' };
    });
  return categoriesRequest;
}

interface GalleryCollection { meals: GalleryMeal[]; source: 'api' | 'sample' }
const categoryRequests = new Map<string, Promise<GalleryCollection>>();

function loadCategory(category: string): Promise<GalleryCollection> {
  const cached = categoryRequests.get(category);
  if (cached) return cached;
  const request = mealApi.get('filter.php', { params: { c: category } })
    .then((response): GalleryCollection => ({
      meals: normalizeMealsResponse(response.data).map((meal) => ({
        idMeal: meal.idMeal, strMeal: meal.strMeal, strMealThumb: meal.strMealThumb, strCategory: category,
      })),
      source: 'api',
    }))
    .catch((): GalleryCollection => {
      categoryRequests.delete(category);
      return { meals: sampleMeals.filter((meal) => meal.strCategory === category), source: 'sample' };
    });
  categoryRequests.set(category, request);
  return request;
}

export async function loadGalleryMeals(categories: string[]): Promise<GalleryCollection> {
  // No selection means no requests and no recipes, rather than an empty-name search.
  const results = await Promise.all([...new Set(categories)].map(loadCategory));
  const meals = [...new Map(results.flatMap((result) => result.meals).map((meal) => [meal.idMeal, meal])).values()]
    .sort((a, b) => a.strMeal.localeCompare(b.strMeal, 'en', { sensitivity: 'base' }));
  return { meals, source: results.some((result) => result.source === 'sample') ? 'sample' : 'api' };
}
