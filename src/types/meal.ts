type IngredientFields = Partial<Record<`strIngredient${number}` | `strMeasure${number}`, string | null>>;
export interface Meal extends IngredientFields {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strMealThumb: string;
  strInstructions: string;
  strTags?: string | null;
  strYoutube?: string | null;
  strSource?: string | null;
}

export interface MealsResponse {
  meals: Meal[] | null;
}

export type GalleryMeal = Pick<Meal, 'idMeal' | 'strMeal' | 'strMealThumb' | 'strCategory'>;
