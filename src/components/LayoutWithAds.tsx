import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AdBanner } from './AdBanner';
import { getAds } from '../lib/api';
import { Ad } from '../types';

function adToProps(ad: Ad) {
  return {
    title: ad.title,
    subtitle: ad.subtitle || undefined,
    description: ad.description || undefined,
    date: ad.date ? (() => { const s = ad.date.replace(/Z$/i, '').replace(/\.\d{3}Z?$/i, ''); return new Date(s); })() : undefined,
    location: ad.location || undefined,
    ctaText: ad.cta_text || 'Ver más',
    ctaLink: ad.cta_link || undefined,
    badge: ad.badge || undefined,
    image: ad.image || undefined,
  };
}

interface LayoutWithAdsProps {
  children: React.ReactNode;
}

export const LayoutWithAds: React.FC<LayoutWithAdsProps> = ({ children }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    getAds()
      .then((data) => { if (mounted) setAds(data.filter(a => a.active && !a.hero)); })
      .catch(() => { if (mounted) setAds([]); })
      .finally(() => { if (mounted) setLoadingAds(false); });
    return () => { mounted = false; };
  }, []);

  const sortedAds = ads.slice().sort((a, b) => a.order - b.order);

  // Mueve el carrusel exactamente un slide (ancho real + gap), sin importar el breakpoint.
  const scrollBySlide = (dir: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slides = track.querySelectorAll<HTMLElement>('[data-slide]');
    const first = slides[0];
    const second = slides[1];
    const step = first && second
      ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
      : first
        ? first.getBoundingClientRect().width
        : track.clientWidth;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-12">
      {!loadingAds && sortedAds.length > 0 && (
        <section className="relative mb-8">
          <div className="overflow-hidden rounded-2xl">
            <div
              ref={trackRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            >
              {sortedAds.map((ad) => (
                <div
                  key={ad.id}
                  data-slide
                  className="w-full sm:w-1/2 lg:w-1/3 flex-shrink-0 snap-start"
                >
                  <AdBanner {...adToProps(ad)} />
                </div>
              ))}
            </div>
          </div>

          {sortedAds.length > 1 && (
            <button
              onClick={() => scrollBySlide(-1)}
              className="absolute -left-3 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full border border-slate-700 backdrop-blur-md shadow-lg transition-all z-10"
              aria-label="Anuncio anterior"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {sortedAds.length > 1 && (
            <button
              onClick={() => scrollBySlide(1)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full border border-slate-700 backdrop-blur-md shadow-lg transition-all z-10"
              aria-label="Siguiente anuncio"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </section>
      )}

      <main className="w-full">
        {children}
      </main>
    </div>
  );
};
