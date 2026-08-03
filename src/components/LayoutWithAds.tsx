import React from 'react';
import { Link } from 'react-router-dom';
import { AdBanner, municipalAds } from './AdBanner';
import { MapPin, Clock } from 'lucide-react';

const municipalEventIds: Record<string, string> = {
  'muni-1': 'exposicion-del-proyecto-mood---sesio',
  'muni-2': 'mood-networking-y-demos---junio-2026',
  'muni-3': 'exposicion-del-proyecto-mood---sesio',
  'muni-4': 'exposicion-del-proyecto-mood---sesio',
  'muni-5': 'mood-networking-y-demos---junio-2026',
  'muni-6': 'exposicion-del-proyecto-mood---sesio'
};

const expoDetails = [
  { label: 'Exposición', time: '14 a 17 hs', desc: 'Presentación oficial y networking' }
];

const nearbyStops = [
  { name: 'Subte B - C. Pellegrini', line: 'Línea B' },
  { name: 'Subte C - Lavalle', line: 'Línea C' },
  { name: 'Colectivo 5, 6, 7, 50', line: 'Varias' },
  { name: 'Colectivo 9, 10, 17, 59', line: 'Varias' },
  { name: 'Colectivo 100, 106, 109', line: 'Varias' },
  { name: 'Estacionamiento', line: 'Subterráneo' }
] as const;

interface LayoutWithAdsProps {
  children: React.ReactNode;
}

export const LayoutWithAds: React.FC<LayoutWithAdsProps> = ({ children }) => {
  const leftAd = municipalAds[0];

  return (
    <div className="flex gap-6 px-4">
      <aside className="hidden lg:block w-[300px] flex-shrink-0 sticky top-20 h-fit">
        <div className="space-y-4">
          <Link to={`/event/${municipalEventIds['muni-1']}`}>
            <AdBanner
              title={leftAd.title}
              subtitle={leftAd.subtitle}
              description={leftAd.description}
              date={leftAd.date}
              location={leftAd.location}
              ctaText={leftAd.ctaText}
              badge={leftAd.badge}
            />
          </Link>
          
          <div className="bg-gradient-to-br from-primary to-accent rounded-xl p-4 text-primary-foreground">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold">Martes 9 de Junio</span>
            </div>
            <p className="text-xs text-primary-foreground/80 mb-2">
              Auditorio Pampa Energía · Av. Corrientes 515, CABA
            </p>
            <div className="space-y-1 mb-2">
              {expoDetails.map((d) => (
                <div key={d.label} className="flex items-center gap-2 text-xs text-primary-foreground/90">
                  <span className="w-2 h-2 bg-primary/40 rounded-full"></span>
                  <span className="font-medium">{d.label}:</span> {d.time}
                </div>
              ))}
            </div>
            <button className="mt-1 w-full py-2 bg-primary/10 dark:bg-primary/20 text-white dark:text-black font-semibold rounded-lg hover:bg-primary/20 transition-colors">
              ¡Te esperamos!
            </button>
          </div>

          <div className="bg-muted rounded-xl p-4">
            <h4 className="font-semibold text-card-foreground text-sm mb-3">📍 ¿Cómo llegar?</h4>
            <ul className="space-y-1.5">
              {nearbyStops.map((stop) => (
                <li key={stop.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin size={12} className="text-primary flex-shrink-0" />
                  <span>{stop.name}</span>
                  <span className="text-muted-foreground/60 ml-auto">{stop.line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {children}
      </main>

      <aside className="hidden xl:block w-[300px] flex-shrink-0 sticky top-20 h-fit">
        <div className="space-y-4">
          <Link to={`/event/${municipalEventIds['muni-3']}`}>
            <AdBanner
              title={municipalAds[2].title}
              subtitle={municipalAds[2].subtitle}
              description={municipalAds[2].description}
              date={municipalAds[2].date}
              location={municipalAds[2].location}
              ctaText={municipalAds[2].ctaText}
              badge={municipalAds[2].badge}
            />
          </Link>

          <Link to="/map?category=cultural" className="block">
            <div className="bg-gradient-to-br from-primary to-accent rounded-xl p-4 text-primary-foreground hover:opacity-90 transition-opacity">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">GRATIS</span>
              </div>
              <h4 className="font-bold text-sm mb-1">Explorá eventos culturales</h4>
              <p className="text-xs text-primary-foreground/80 mb-2">Más de 200 eventos gratis en toda la ciudad</p>
              <span className="block w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg text-center">
                Ver eventos
              </span>
            </div>
          </Link>

          <div className="bg-muted rounded-xl p-3">
            <h4 className="font-semibold text-card-foreground text-sm mb-2">✨ Funcionalidades MOOD</h4>
            <div className="space-y-1.5">
              {[
                { title: 'Mapa interactivo', desc: 'Explorá eventos cerca de ti' },
                { title: 'Filtros por estado de ánimo', desc: 'Encontrá el plan perfecto' },
                { title: 'Cobertura nacional', desc: 'Todas las provincias argentinas' }
              ].map((f) => (
                <Link key={f.title} to="/map" className="block">
                  <div className="flex items-center gap-2 bg-card rounded-lg p-2 hover:bg-primary/5 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-card-foreground truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-primary-foreground">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎯</span>
              <div>
                <p className="font-bold text-sm">Proyecto MOOD</p>
                <p className="text-xs text-primary-foreground/80">Martes 9 de Junio</p>
              </div>
            </div>
              <p className="text-xs text-primary-foreground/80 mt-1 mb-2">
              Presentación en el Auditorio Pampa Energía. De 14 a 17 hs con demos y networking.
            </p>
            <div className="flex gap-1.5 mt-2">
              <Link
                to="/event/exposicion-del-proyecto-mood---sesio"
                className="flex-1 text-xs bg-primary/20 hover:bg-primary/30 rounded px-2 py-1 text-center transition-colors"
              >
                Exposición
              </Link>
              <Link
                to="/event/mood-networking-y-demos---junio-2026"
                className="flex-1 text-xs bg-primary/20 hover:bg-primary/30 rounded px-2 py-1 text-center transition-colors"
              >
                Networking
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
