import { useState } from 'react';

interface MealImageProps {
  src: string;
  name: string;
}

export default function MealImage({ src, name }: MealImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && failedSrc !== src ? (
    <img className="meal-image" src={src} alt={name} loading="lazy" onError={() => setFailedSrc(src)} />
  ) : (
    <div className="image-placeholder">Meal image placeholder</div>
  );
}
