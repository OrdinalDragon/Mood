import React, { useEffect, useState } from 'react';
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
  const [featuredIndex, setFeaturedIndex] = useState(0);

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

  const safeIndex = featuredAds.length ? featuredIndex % featuredAds.length : 0;

  // Autoplay: avanza una slide a la vez, en bucle
  useEffect(() => {
    if (featuredAds.length < 2) return;
    const id = setInterval(() => {
      setFeaturedIndex((prev) => prev + 1);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [featuredAds.length]);

  return (
    <div className="px-4 pb-12">
      {!loadingAds && featuredAds.length > 0 && (
        <section className="relative mb-8 overflow-hidden rounded-2xl">
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {featuredAds.map((ad) => (
              <div key={ad.id} className="w-full flex-shrink-0">
                <AdBanner {...adToProps(ad)} variant="banner" />
              </div>
            ))}
          </div>

          {featuredAds.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {featuredAds.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFeaturedIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === safeIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                  aria-label={`Ir al anuncio ${i + 1}`}
                />
              ))}
            </div>
          )}
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
