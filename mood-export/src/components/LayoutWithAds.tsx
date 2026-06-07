import React from 'react';
import { Link } from 'react-router-dom';
import { AdBanner, municipalAds } from './AdBanner';
import { Gift } from 'lucide-react';

const municipalEventIds: Record<string, string> = {
  'muni-1': 'e87f7c11-e5ff-45e6-8b27-82de4ebe4cf0',
  'muni-2': '9cbca67a-12ba-4761-b605-ba48c52444ad',
  'muni-3': 'fab82a3e-d98c-42da-90ff-538eceab8992',
  'muni-4': 'a05fbaf9-1808-4562-aeb1-1b288c6a47d6',
  'muni-5': '4210c4fa-3e77-4297-8bba-63b7fc496869',
  'muni-6': '8db43197-aa22-401f-871e-b1f38f8cdd33'
};

const giveawayEventIds: Record<string, string> = {
  'giveaway-1': 'e1256b60-60d6-44e4-8deb-b83149674551',
  'giveaway-2': '0b6f3b7a-839a-4ab9-b8b2-f787739f7031',
  'giveaway-3': 'b7c79b01-3b96-4a88-b7be-08f2b5b0d8ce'
};

const giveawaysData = [
  { id: 'giveaway-1', title: 'Entradas Festival Primavera', prize: '2 entradas dobles', badge: 'SORTEO' },
  { id: 'giveaway-2', title: 'Clase de Yoga Gratis', prize: '10 clases gratis', badge: 'SORTEO' },
  { id: 'giveaway-3', title: 'Tour Gastronómico', prize: 'Tour para 2 personas', badge: 'SORTEO' }
];

const zones = [
  { name: 'Palermo', lat: -34.58, lng: -58.41 },
  { name: 'Villa Crespo', lat: -34.60, lng: -58.44 },
  { name: 'Caballito', lat: -34.62, lng: -58.44 },
  { name: 'Villa Urquiza', lat: -34.55, lng: -58.51 },
  { name: 'Ciudadela', lat: -34.64, lng: -58.45 },
  { name: 'Ramos Mejía', lat: -34.65, lng: -58.56 }
] as const;

interface LayoutWithAdsProps {
  children: React.ReactNode;
}

export const LayoutWithAds: React.FC<LayoutWithAdsProps> = ({ children }) => {
  const leftAd = municipalAds[0];

  return (
    <div className="flex gap-6">
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
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold">M</span>
              </div>
              <span className="text-sm font-semibold">Municipalidad de MOOD</span>
            </div>
            <p className="text-xs text-white/80">
              Seguinos para estar informado sobre todos los eventos gratuitos de tu zona.
            </p>
            <button className="mt-3 w-full py-2 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors">
              Seguir @MuniMood
            </button>
          </div>

          <div className="bg-slate-100 rounded-xl p-4">
            <h4 className="font-semibold text-slate-900 text-sm mb-3">📅 Próximos eventos</h4>
            <ul className="space-y-2">
              {municipalAds.slice(2, 5).map((ad) => {
                const eventId = municipalEventIds[ad.id];
                return (
                  <li key={ad.id} className="text-xs">
                    <Link to={`/event/${eventId}`} className="text-slate-700 hover:text-blue-600 font-medium block line-clamp-1">
                      {ad.title}
                    </Link>
                    <span className="text-slate-500">
                      {ad.date?.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </span>
                  </li>
                );
              })}
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

          <Link to={`/event/${giveawayEventIds['giveaway-1']}`} className="block">
            <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl p-4 text-white hover:opacity-90 transition-opacity">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-6 h-6" />
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">SORTEO</span>
              </div>
              <h4 className="font-bold text-lg mb-1">{giveawaysData[0].title}</h4>
              <p className="text-sm text-white/90 mb-2">Premio: {giveawaysData[0].prize}</p>
              <span className="block w-full py-2 bg-white text-orange-600 text-sm font-semibold rounded-lg text-center">
                Participar
              </span>
            </div>
          </Link>

          <div className="bg-slate-100 rounded-xl p-3">
            <h4 className="font-semibold text-slate-900 text-sm mb-2">🎁 Más sorteos</h4>
            <div className="space-y-2">
              {giveawaysData.slice(1).map((g) => (
                <Link key={g.id} to={`/event/${giveawayEventIds[g.id]}`} className="block">
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 hover:bg-orange-50 transition-colors">
                    <Gift className="w-4 h-4 text-orange-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{g.title}</p>
                      <p className="text-xs text-slate-500">{g.prize}</p>
                    </div>
                  </div>
                </Link>
              ))}
              <Link to="/giveaways" className="block text-center text-xs text-orange-600 hover:text-orange-700">
                Ver todos los sorteos →
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-bold">¿Conocés tu distrito?</p>
                <p className="text-xs text-white/80">Explorá todos los barrios</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-3">
              {zones.map((zone) => (
                <Link 
                  key={zone.name}
                  to={`/map?city=${encodeURIComponent(zone.name)}`}
                  className="text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-center transition-colors block"
                >
                  {zone.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-slate-100 rounded-xl p-4">
            <h4 className="font-semibold text-slate-900 text-sm mb-3">📱 Descargá la app</h4>
            <p className="text-xs text-slate-600 mb-3">
              Accedé a eventos exclusivos y notificaciones personalizadas.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-lg transition-colors">
                App Store
              </button>
              <button className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-lg transition-colors">
                Google Play
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
