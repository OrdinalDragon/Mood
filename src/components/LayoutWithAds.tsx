import React, { useEffect, useState } from 'react';
import { AdBanner } from './AdBanner';
import { getAds } from '../lib/api';
import { Ad } from '../types';

// Copias del set de ads en el track del marquee (deben ser >= 2 para el bucle sin fin)
const MARQUEE_COPIES = 4;

function adToProps(ad: Ad) {
  return {
    title: ad.title,
    subtitle: ad.subtitle || undefined,
    description: ad.description || undefined,
    date: ad.date ? new Date(ad.date) : undefined,
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

  useEffect(() => {
    let mounted = true;
    getAds()
      .then((data) => { if (mounted) setAds(data.filter(a => a.active)); })
      .catch(() => { if (mounted) setAds([]); })
      .finally(() => { if (mounted) setLoadingAds(false); });
    return () => { mounted = false; };
  }, []);

  const carouselAds = ads.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="px-4 pb-12">
      {!loadingAds && carouselAds.length > 0 && (
        <section className="relative mb-8">
          <div className="overflow-hidden">
            <div
              className="marquee flex w-max gap-4 py-1 hover:[animation-play-state:paused]"
              style={{
                '--marquee-copies': MARQUEE_COPIES,
                '--marquee-duration': `${Math.max(8, carouselAds.length * 5) * MARQUEE_COPIES}s`,
              } as React.CSSProperties}
            >
              {Array.from({ length: MARQUEE_COPIES }, (_, copy) =>
                carouselAds.map((ad) => (
                  <div key={`${ad.id}-${copy}`} data-slide className="w-72 flex-shrink-0">
                    <AdBanner {...adToProps(ad)} />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <div className="flex gap-6">
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
