import type { Meal } from '../types/meal';

export function getIngredients(meal: Meal) {
  const ingredients: { name: string; measure: string }[] = [];
  for (let index = 1; index <= 20; index++) {
    const name = meal[`strIngredient${index}`]?.trim();
    if (name) ingredients.push({ name, measure: meal[`strMeasure${index}`]?.trim() ?? '' });
  }
  return ingredients;
}
export function filterByCategories(meals: Meal[], categories: string[]) {
  return categories.length ? meals.filter((meal) => categories.includes(meal.strCategory)) : meals;
}
export function getNeighbors(ids: string[], current: string) {
  const index = ids.indexOf(current);
  if (index < 0 || !ids.length) return null;
  return { previous: ids[(index - 1 + ids.length) % ids.length], next: ids[(index + 1) % ids.length], position: index + 1, total: ids.length };
}
export function readNavigation(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const state = value as { ids?: unknown; backTo?: unknown };
  if (!Array.isArray(state.ids) || !state.ids.every((id): id is string => typeof id === 'string')
      || (state.backTo !== '/search' && state.backTo !== '/gallery')) return null;
  return { ids: state.ids as string[], backTo: state.backTo };
}
export function safeExternalUrl(value?: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
