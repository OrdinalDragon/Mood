/**
 * ============================================================
 * src/components/StarRating.tsx - Estrellas con mitades
 * ============================================================
 * Puntaje interno de 1 a 10 → se muestra como 5 estrellas.
 */

import React from 'react';
import { Star } from 'lucide-react';

const starColor = 'text-amber-400';

// ============================================================
// DISPLAY (solo lectura)
// ============================================================

interface StarRatingDisplayProps {
  value: number;
  size?: number;
  className?: string;
}

export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({ value, size = 16, className }) => {
  const pct = Math.max(0, Math.min(10, value)) * 10;

  return (
    <span className={`relative inline-flex align-middle ${className || ''}`} title={`${value}/10`}>
      <span className="flex" style={{ gap: 1 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <Star key={i} size={size} className="text-slate-300 dark:text-slate-600 fill-slate-300 dark:fill-slate-600" />
        ))}
      </span>
      <span className="absolute top-0 left-0 overflow-hidden whitespace-nowrap" style={{ width: `${pct}%` }}>
        <span className="flex" style={{ gap: 1 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <Star key={i} size={size} className={`${starColor} fill-amber-400 flex-shrink-0`} />
          ))}
        </span>
      </span>
    </span>
  );
};

// ============================================================
// INPUT (interactivo, pasos de 0.5 estrella = 1 punto)
// ============================================================

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  className?: string;
}

export const StarRatingInput: React.FC<StarRatingInputProps> = ({ value, onChange, size = 28, className }) => {
  const [preview, setPreview] = React.useState<number | null>(null);
  const display = preview ?? value;

  return (
    <div className={`inline-flex items-center gap-2 ${className || ''}`}>
      <div className="flex" style={{ gap: 2 }}>
        {[0, 1, 2, 3, 4].map(i => {
          const fill = Math.max(0, Math.min(10, display)) - i * 2;
          return (
            <div key={i} className="relative" style={{ width: size, height: size }}>
              <Star size={size} className="absolute inset-0 text-slate-300 dark:text-slate-600" />
              {fill >= 1 && (
                <span className="absolute top-0 left-0 overflow-hidden" style={{ width: `${Math.min(100, (fill / 2) * 100)}%`, height: size }}>
                  <Star size={size} className={`${starColor} fill-amber-400 flex-shrink-0`} />
                </span>
              )}
              <button
                type="button"
                className="absolute left-0 top-0 h-full w-1/2 cursor-pointer"
                aria-label={`Puntuar ${i * 2 + 1}`}
                onMouseEnter={() => setPreview(i * 2 + 1)}
                onMouseLeave={() => setPreview(null)}
                onClick={() => onChange(i * 2 + 1)}
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-full w-1/2 cursor-pointer"
                aria-label={`Puntuar ${i * 2 + 2}`}
                onMouseEnter={() => setPreview(i * 2 + 2)}
                onMouseLeave={() => setPreview(null)}
                onClick={() => onChange(i * 2 + 2)}
              />
            </div>
          );
        })}
      </div>
      <span className="text-sm font-semibold text-muted-foreground">{display}/10</span>
    </div>
  );
};
