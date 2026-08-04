import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    let mounted = true;
    getAds()
      .then((data) => { if (mounted) setAds(data.filter(a => a.active && !a.hero)); })
      .catch(() => { if (mounted) setAds([]); })
      .finally(() => { if (mounted) setLoadingAds(false); });
    return () => { mounted = false; };
  }, []);

  const sortedAds = ads.slice().sort((a, b) => a.order - b.order);
  const leftAds = sortedAds.filter((_, i) => i % 2 === 0);
  const rightAds = sortedAds.filter((_, i) => i % 2 === 1);

  return (
    <div className="flex gap-6 px-4 pb-12">
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
  );
};
