import type { Meal } from '../types/meal';

export type SortProperty = 'strMeal' | 'strCategory' | 'strArea';
export type SortOrder = 'ascending' | 'descending';

export function filterAndSortMeals(
  meals: Meal[], query: string, property: SortProperty, order: SortOrder,
) {
  const search = query.trim().toLocaleLowerCase();
  const direction = order === 'ascending' ? 1 : -1;
  return meals
    .filter((meal) => meal.strMeal.toLocaleLowerCase().includes(search))
    .sort((a, b) => direction * (
      a[property].localeCompare(b[property], 'en', { sensitivity: 'base', numeric: true })
      || a.strMeal.localeCompare(b.strMeal, 'en', { sensitivity: 'base' })
      || a.idMeal.localeCompare(b.idMeal)
    ));
}
