import { useState } from 'react';
import { Link } from 'react-router-dom';
import useMealSearch from '../hooks/useMealSearch';
import { filterAndSortMeals, type SortProperty, type SortOrder } from '../utils/mealList';

export default function ListView() {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortProperty>('strMeal');
  const [order, setOrder] = useState<SortOrder>('ascending');
  const { meals, source, loading, retry, hasQuery, supported } = useMealSearch(query);
  const results = filterAndSortMeals(meals, query, sortBy, order);

  return (
    <section>
      <h2>Search recipes</h2>
      <p className="muted">Search by the beginning of a recipe name. Start with a letter, then keep typing to narrow the results.</p>
      {source === 'sample' && !loading && (
        <div className="notice" role="status">
          The Meal DB is unavailable. Showing local sample recipes.
          <button type="button" onClick={retry}>Try API again</button>
        </div>
      )}
      <div className="controls">
        <label>Search
          <input type="search" placeholder="Search by meal name" value={query}
            onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>Sort by
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortProperty)}>
            <option value="strMeal">Name</option>
            <option value="strCategory">Category</option>
            <option value="strArea">Area</option>
          </select>
        </label>
        <label>Order
          <select value={order} onChange={(event) => setOrder(event.target.value as SortOrder)}>
            <option value="ascending">Ascending</option>
            <option value="descending">Descending</option>
          </select>
        </label>
      </div>
      {hasQuery && <p role="status" aria-live="polite">
        {!supported ? 'Start with an English letter (A–Z).' : loading ? 'Loading recipes…' : `${results.length} of ${meals.length} recipes`}
      </p>}
      {hasQuery && supported && !loading && results.length === 0 && <p>No recipes match “{query}”. Try another name.</p>}
      {hasQuery && supported && !loading && <ul className="meal-list">
        {results.map((meal) => (
          <li key={meal.idMeal}>
            <Link to={`/meal/${meal.idMeal}`} state={{ ids: results.map((item) => item.idMeal), backTo: '/search' }}>
              <strong>{meal.strMeal}</strong>
              <span>{meal.strCategory} · {meal.strArea}</span>
            </Link>
          </li>
        ))}
      </ul>}
    </section>
  );
}
