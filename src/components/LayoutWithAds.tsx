import React, { useEffect, useRef, useState } from 'react';
import { AdBanner } from './AdBanner';
import { getAds } from '../lib/api';
import { Ad } from '../types';

// Intervalo del autoplay del carrusel
const AUTOPLAY_INTERVAL_MS = 5000;

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
      .then((data) => { if (mounted) setAds(data.filter(a => a.active)); })
      .catch(() => { if (mounted) setAds([]); })
      .finally(() => { if (mounted) setLoadingAds(false); });
    return () => { mounted = false; };
  }, []);

  const sortByOrder = (list: Ad[]) => list.slice().sort((a, b) => a.order - b.order);
  const featuredAds = sortByOrder(ads.filter(a => a.hero));
  const columnAds = sortByOrder(ads.filter(a => !a.hero));
  const leftAds = columnAds.filter((_, i) => i % 2 === 0);
  const rightAds = columnAds.filter((_, i) => i % 2 === 1);

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

  // Autoplay: avanza una card por vez y vuelve al inicio al llegar al final
  useEffect(() => {
    if (featuredAds.length < 2) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 4) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollBySlide(1);
      }
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [featuredAds.length]);

  return (
    <div className="px-4 pb-12">
      {!loadingAds && featuredAds.length > 0 && (
        <section className="relative mb-8">
          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-1"
          >
            {featuredAds.map((ad) => (
              <div key={ad.id} data-slide className="w-72 flex-shrink-0 snap-start">
                <AdBanner {...adToProps(ad)} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-6">
        <aside className="hidden lg:block w-[300px] flex-shrink-0 sticky top-20 h-fit">
          <div className="space-y-4">
            {leftAds.map((ad) => (
              <AdBanner key={ad.id} {...adToProps(ad)} />
            ))}
            {leftAds.length === 0 && !loadingAds && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No hay anuncios para mostrar
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {children}
        </main>

        <aside className="hidden xl:block w-[300px] flex-shrink-0 sticky top-20 h-fit">
          <div className="space-y-4">
            {rightAds.map((ad) => (
              <AdBanner key={ad.id} {...adToProps(ad)} />
            ))}
            {rightAds.length === 0 && !loadingAds && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No hay anuncios para mostrar
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
