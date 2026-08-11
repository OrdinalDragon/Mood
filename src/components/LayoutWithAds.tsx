import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // [CAMBIO] Importamos los íconos para las flechas del carrusel
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
  
  
  const [currentIndex, setCurrentIndex] = useState(0); // Estado para controlar la posición actual del carrusel

  useEffect(() => {
    let mounted = true;
    getAds()
      .then((data) => { if (mounted) setAds(data.filter(a => a.active && !a.hero)); })
      .catch(() => { if (mounted) setAds([]); })
      .finally(() => { if (mounted) setLoadingAds(false); });
    return () => { mounted = false; };
  }, []);

  const sortedAds = ads.slice().sort((a, b) => a.order - b.order);

  // Ya no dividimos las ads en leftAds y rightAds para las columnas laterales.
  // const leftAds = sortedAds.filter((_, i) => i % 2 === 0);
  // const rightAds = sortedAds.filter((_, i) => i % 2 === 1);

  //Funciones para avanzar y retroceder en el carrusel
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? sortedAds.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === sortedAds.length - 1 ? 0 : prev + 1));
  };

  return (
    // Cambiamos flex por un contenedor centrado de ancho máximo
    <div className="w-full max-w-7xl mx-auto px-4 pb-12">

      {/* Carrusel Horizontal Superior */}
      {!loadingAds && sortedAds.length > 0 && (
        <section className="relative mb-8 group">
          <div className="overflow-hidden rounded-2xl">
            {/* Contenedor responsivo con animación de desplazamiento */}
            <div 
              className="flex gap-4 transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * (100 / Math.min(sortedAds.length, 3))}%)` }}
            >
              {sortedAds.map((ad) => (
                <div 
                  key={ad.id} 
                  className="w-full sm:w-1/2 lg:w-1/3 flex-shrink-0"
                >
                  <AdBanner {...adToProps(ad)} />
                </div>
              ))}
            </div>
          </div>

          {/* Botón Flecha Izquierda */}
          {sortedAds.length > 1 && (
            <button
              onClick={prevSlide}
              className="absolute -left-3 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full border border-slate-700 backdrop-blur-md shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label="Anuncio anterior"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Botón Flecha Derecha */}
          {sortedAds.length > 1 && (
            <button
              onClick={nextSlide}
              className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full border border-slate-700 backdrop-blur-md shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label="Siguiente anuncio"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </section>
      )}

      {/* Se quitaron los dos <aside> laterales de 300px */}

      {/* El contenido principal ahora ocupa el 100% del ancho horizontal */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
};