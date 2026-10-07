import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MealImage from '../components/MealImage';
import { sampleMeals } from '../data/sampleMeals';
import useMeals from '../hooks/useMeals';
import { getMealById } from '../services/mealApi';
import type { Meal } from '../types/meal';
import { getIngredients, getNeighbors, readNavigation, safeExternalUrl } from '../utils/mealDetails';

export default function DetailView() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigation = readNavigation(location.state);
  const { meals, loading } = useMeals();
  const [lookup, setLookup] = useState<{ id: string; meal: Meal | null; failed?: boolean } | null>(null);
  const localMeal = sampleMeals.find((item) => item.idMeal === id);
  const index = meals.findIndex((item) => item.idMeal === id);
  const meal = localMeal ?? meals[index] ?? (lookup && lookup.id === id ? lookup.meal : null);

  useEffect(() => {
    if (!id || loading || meal || lookup?.id === id) return;
    let active = true;
    getMealById(id).then((result) => {
      if (active) setLookup({ id, meal: result });
    }).catch(() => {
      if (active) setLookup({ id, meal: null, failed: true });
    });
    return () => { active = false; };
  }, [id, loading, meal, lookup]);

  if (!meal && lookup?.failed && lookup.id === id) return <Navigate replace
    to={`/meal/${sampleMeals[0].idMeal}`} state={{ ids: sampleMeals.map((item) => item.idMeal), backTo: navigation?.backTo ?? '/search' }} />;
  if (!meal && (loading || lookup?.id !== id)) return <p role="status">Loading recipe…</p>;
  if (!meal) {
    return <section><h2>Recipe unavailable</h2><p>The recipe could not be found or loaded. Local sample recipes are available from search.</p><Link to="/search">Back to search</Link></section>;
  }

  const navigationMeals = localMeal ? sampleMeals : meals;
  const ids = id && navigation?.ids.includes(id) ? navigation.ids
    : [...new Set([meal.idMeal, ...navigationMeals.map((item) => item.idMeal)])];
  const neighbors = getNeighbors(ids, meal.idMeal);
  const routeState = { ids, backTo: navigation?.backTo ?? '/search' };
  const ingredients = getIngredients(meal);
  const instructions = meal.strInstructions.split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
  const video = safeExternalUrl(meal.strYoutube);
  const original = safeExternalUrl(meal.strSource);

  return (
    <section>
      <div className="detail-navigation">
        {neighbors && <Link to={`/meal/${neighbors.previous}`} state={routeState}>← Previous</Link>}
        <Link to={routeState.backTo}>Back to {routeState.backTo === '/gallery' ? 'gallery' : 'search'}</Link>
        {neighbors && <Link to={`/meal/${neighbors.next}`} state={routeState}>Next →</Link>}
      </div>
      {neighbors && <p className="muted">Recipe {neighbors.position} of {neighbors.total}</p>}
      <h2>{meal.strMeal}</h2>
      {localMeal && <p className="notice" role="status">Showing a local sample recipe because live data is unavailable for this view.</p>}
      <div className="detail-grid">
        <MealImage src={meal.strMealThumb} name={meal.strMeal} />
        <div>
          <dl>
            <dt>Category</dt><dd>{meal.strCategory}</dd>
            <dt>Area</dt><dd>{meal.strArea}</dd>
            {meal.strTags && <><dt>Tags</dt><dd>{meal.strTags.split(',').join(', ')}</dd></>}
          </dl>
          <h3>Ingredients</h3>
          {ingredients.length ? <ul className="ingredients">
            {ingredients.map((ingredient, index) => <li key={`${index}-${ingredient.name}`}>
              <span>{ingredient.name}</span><span>{ingredient.measure}</span>
            </li>)}
          </ul> : <p>Ingredient information is not provided.</p>}
          <div className="recipe-links">
            {video && <a href={video} target="_blank" rel="noreferrer">Watch cooking video ↗</a>}
            {original && <a href={original} target="_blank" rel="noreferrer">Original recipe ↗</a>}
          </div>
        </div>
      </div>
      <div className="instructions">
        <h3>Instructions</h3>
        {instructions.length ? instructions.map((step, index) => <p key={index}>{step}</p>) : <p>Instructions are not provided.</p>}
      </div>
    </section>
  );
}
