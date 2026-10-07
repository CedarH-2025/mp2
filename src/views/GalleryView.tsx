import { useState } from 'react';
import { Link } from 'react-router-dom';
import MealImage from '../components/MealImage';
import useGalleryMeals from '../hooks/useGalleryMeals';

export default function GalleryView() {
  const [selected, setSelected] = useState<string[]>(['Beef']);
  const { meals: results, categories, loading, usingSamples, categoryFallback, retry } = useGalleryMeals(selected);
  function toggle(category: string) {
    setSelected((current) => current.includes(category)
      ? current.filter((item) => item !== category) : [...current, category]);
  }

  return (
    <section>
      <h2>Recipe gallery</h2>
      <p className="muted">Select one or more categories to explore recipes.</p>
      {(usingSamples || categoryFallback) && !loading && <div className="notice" role="status">
        {usingSamples ? 'Some API requests failed. Local sample recipes are used for unavailable categories.' : 'Category options are temporarily provided from a local list.'}
        <button type="button" onClick={retry}>Try API again</button>
      </div>}
      <fieldset className="category-filters">
        <legend>Categories</legend>
        <button type="button" onClick={() => setSelected([])} disabled={!selected.length}>Clear filters</button>
        {categories.map((category) => <label className="category-option" key={category}>
          <input type="checkbox" checked={selected.includes(category)} onChange={() => toggle(category)} />{category}
        </label>)}
      </fieldset>
      <p role="status" aria-live="polite">{!selected.length ? '0/0' : loading ? 'Loading recipes…' : `${results.length}/${results.length}`}</p>
      {!selected.length && <div className="gallery-empty">please select a category</div>}
      {selected.length > 0 && !loading && !results.length && <p>No recipes are available for the selected categories.</p>}
      {selected.length > 0 && !loading && <div className="gallery-grid">
        {results.map((meal) => (
          <Link className="meal-card" key={meal.idMeal} to={`/meal/${meal.idMeal}`}
            state={{ ids: results.map((item) => item.idMeal), backTo: '/gallery' }}>
            <MealImage src={meal.strMealThumb} name={meal.strMeal} />
            <h3>{meal.strMeal}</h3>
            <p>{meal.strCategory}</p>
          </Link>
        ))}
      </div>}
    </section>
  );
}
