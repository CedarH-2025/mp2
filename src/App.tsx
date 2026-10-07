import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ListView from './views/ListView';
import GalleryView from './views/GalleryView';
import DetailView from './views/DetailView';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/search" replace />} />
        <Route path="search" element={<ListView />} />
        <Route path="gallery" element={<GalleryView />} />
        <Route path="meal/:id" element={<DetailView />} />
        <Route path="*" element={<p>Page not found. Use the navigation above.</p>} />
      </Route>
    </Routes>
  );
}
