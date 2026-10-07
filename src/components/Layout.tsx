import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <p className="eyebrow">MP2 · The Meal DB</p>
        <h1>Meal Explorer</h1>
        <nav aria-label="Main navigation">
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/gallery">Gallery</NavLink>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer>Meal Explorer · Recipes from <a href="https://www.themealdb.com/">The Meal DB</a></footer>
    </div>
  );
}
