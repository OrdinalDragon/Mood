import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Calendar, ArrowRight, LocateFixed, Loader2 } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEventCounts, getAds } from '../lib/api';
import { Ad } from '../types';

const PROVINCES = [
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", 
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", 
  "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", 
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"
];

const HERO_GRADIENTS: Record<string, {
  card: string;
  badge: string;
  text: string;
  footerBg: string;
  footerText: string;
  button: string;
}> = {
  blue: {
    card: 'bg-gradient-to-br from-blue-600 to-blue-800',
    badge: 'bg-blue-500',
    text: 'text-blue-100',
    footerBg: 'bg-blue-900/50',
    footerText: 'text-blue-200',
    button: 'bg-white text-blue-600 hover:bg-blue-50',
  },
  purple: {
    card: 'bg-gradient-to-br from-purple-600 to-pink-500',
    badge: 'bg-purple-500',
    text: 'text-purple-100',
    footerBg: 'bg-purple-900/50',
    footerText: 'text-purple-200',
    button: 'bg-white text-purple-600 hover:bg-purple-50',
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-600 to-teal-700',
    badge: 'bg-emerald-500',
    text: 'text-emerald-100',
    footerBg: 'bg-emerald-900/50',
    footerText: 'text-emerald-200',
    button: 'bg-white text-emerald-600 hover:bg-emerald-50',
  },
  rose: {
    card: 'bg-gradient-to-br from-rose-600 to-red-700',
    badge: 'bg-rose-500',
    text: 'text-rose-100',
    footerBg: 'bg-rose-900/50',
    footerText: 'text-rose-200',
    button: 'bg-white text-rose-600 hover:bg-rose-50',
  },
  violet: {
    card: 'bg-gradient-to-br from-violet-600 to-indigo-700',
    badge: 'bg-violet-500',
    text: 'text-violet-100',
    footerBg: 'bg-violet-900/50',
    footerText: 'text-violet-200',
    button: 'bg-white text-violet-600 hover:bg-violet-50',
  },
  orange: {
    card: 'bg-gradient-to-br from-orange-500 to-rose-500',
    badge: 'bg-orange-500',
    text: 'text-orange-100',
    footerBg: 'bg-orange-900/50',
    footerText: 'text-orange-200',
    button: 'bg-white text-orange-600 hover:bg-orange-50',
  },
};

const HERO_BADGE_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
};

const quickLinks = [
  { label: 'Hoy', filter: 'today' },
  { label: 'Este finde', filter: 'weekend' },
  { label: 'Gratis', filter: 'free' },
  { label: 'Al aire libre', filter: 'outdoor' },
];

export const Hero: React.FC = () => {
  const navigate = useNavigate();
  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [heroAds, setHeroAds] = useState<Ad[]>([]);

  useEffect(() => {
    getAds().then(data => {
      const hero = data
        .filter(a => a.hero)
        .sort((a, b) => a.order - b.order)
        .slice(0, 2);
      setHeroAds(hero.length > 0 ? hero : data.slice(0, 2));
    }).catch(() => setHeroAds([]));
  }, []);

  useEffect(() => {
    getEventCounts().then(data => {
      setEventCounts({
        today: data.today,
        weekend: data.weekend,
        free: data.free,
        outdoor: data.outdoor,
      });
    }).catch(() => {
      setEventCounts({ today: 0, weekend: 0, free: 0, outdoor: 0 });
    });
  }, []);

  const categoryMap: Record<string, string> = {
    'Cultural': 'cultural',
    'Aventura': 'adventure',
    'Relax': 'relax',
    'Nocturno': 'nightlife',
    'Grupal': 'group',
    'Individual': 'individual'
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    const catValue = categoryMap[category] || category.toLowerCase();
    navigate(`/map?category=${catValue}`);
  };

  const handleQuickLinkClick = (filter: string) => {
    navigate(`/map?filter=${filter}`);
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalización no soportada');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        navigate(`/map?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
      },
      (err) => {
        setLocating(false);
        setGeoError('No se pudo obtener tu ubicación');
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (province) params.set('province', province);
    if (city) params.set('city', city);
    navigate(`/map?${params.toString()}`);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{id: string; title: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const fetchSuggestions = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/events/?status_filter=approved`);
          const events = await response.json();
          const filtered = events
            .filter((e: any) => 
              e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              e.location?.city?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 5);
          setSuggestions(filtered.map((e: any) => ({ id: e.id, title: e.title, city: e.location?.city })));
        } catch (err) {
          console.error('Error fetching suggestions:', err);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const handleSuggestionClick = (suggestion: {id: string; title: string}) => {
    navigate(`/event/${suggestion.id}`);
  };

  return (
    <div className="relative overflow-hidden bg-muted py-16 sm:py-24">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      <div className="container relative mx-auto px-4">
<img 
           src="/titulo.webp" 
           alt="MOOD" 
           className="w-64 sm:w-80 mx-auto mb-6"
         />
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl mb-4 text-center titulo-animado-mood" style={{ textShadow: '0 0 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)' }}>
          Explorá tu ciudad
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300 mb-8 text-center">
          Descubrí los mejores eventos, lugares y actividades en Argentina. 
          Filtrá según cómo te sentís hoy y viví experiencias únicas.
        </p>

        {heroAds.length > 0 && (
        <div className="flex items-start justify-center gap-6">
          {heroAds[0] && (() => {
            const ad = heroAds[0];
            const g = HERO_GRADIENTS[ad.gradient || ''] || HERO_GRADIENTS['blue'];
            const badgeColor = (ad.badge_color && HERO_BADGE_COLORS[ad.badge_color]) || g.badge;
            return (
              <a key={ad.id} href={ad.cta_link || '#'} className="hidden lg:block w-64 flex-shrink-0">
                <Card className={`${g.card} border-0 overflow-hidden hover:opacity-95 transition-opacity`}>
                  <CardContent className="p-0">
                    <div className="relative p-4 text-white">
                      {ad.badge && (
                        <Badge className={`absolute top-2 left-2 ${badgeColor} text-white border-0 text-xs`}>
                          {ad.badge}
                        </Badge>
                      )}
                      <div className="text-4xl mb-2 mt-4">{ad.icon || '🎉'}</div>
                      <h3 className="font-bold text-lg">{ad.title}</h3>
                      {ad.subtitle && <p className={`${g.text} text-sm mb-2`}>{ad.subtitle}</p>}
                      {ad.description && <p className={`${g.text} text-xs mb-3`}>{ad.description}</p>}
                      <Button className={`w-full ${g.button} font-semibold text-sm`}>
                        {ad.cta_text || 'Ver más'}
                      </Button>
                    </div>
                    {ad.footer && (
                      <div className={`${g.footerBg} px-4 py-2 text-center`}>
                        <p className={`text-xs ${g.footerText}`}>{ad.footer}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </a>
            );
          })()}

          <div className="flex-1 max-w-4xl">
            <div className="rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-2 mb-4">
              <div className="flex-1 flex items-center px-4 gap-2 border-b md:border-b-0 md:border-r border-slate-100 py-2">
                <MapPin className="text-primary" size={20} />
                <Select onValueChange={setProvince}>
                  <SelectTrigger className="border-0 focus:ring-0 shadow-none text-slate-700 dark:text-slate-200 font-medium">
                    <SelectValue placeholder="Provincia" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 flex items-center px-4 gap-2 py-2 relative">
                <Search className="text-slate-400 dark:text-slate-500" size={20} />
                <Input 
                  placeholder="Ciudad o evento..." 
                  className="border-0 focus-visible:ring-0 shadow-none text-slate-700 dark:text-slate-200 font-medium"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCity(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSuggestionClick(s)}
                        className="w-full text-left px-4 py-2 hover:bg-primary/5 border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{s.title}</p>
                        {s.city && <p className="text-xs text-slate-500 dark:text-slate-400">{s.city}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleSearch}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-12 md:h-auto font-bold transition-all hover:scale-105"
              >
                Buscar Planes
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {['Cultural', 'Aventura', 'Relax', 'Nocturno', 'Grupal', 'Individual'].map((tag) => (
                <button 
                  key={tag} 
                  onClick={() => handleCategoryClick(tag)}
                  className="px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all shadow-sm cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {quickLinks.map((link) => (
                <button 
                  key={link.label} 
                  onClick={() => handleQuickLinkClick(link.filter)}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-primary transition-colors cursor-pointer"
                >
                  <Calendar size={14} />
                  <span className="font-medium">{link.label}</span>
                  <span className="text-slate-400 dark:text-slate-500">({eventCounts[link.filter] || 0})</span>
                </button>
              ))}
              <button
                onClick={handleNearMe}
                disabled={locating}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
              >
                {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                <span className="font-medium">Cerca de mí</span>
              </button>
            </div>
            {geoError && (
              <p className="text-xs text-red-500 text-center mt-2">{geoError}</p>
            )}
          </div>

          {heroAds[1] && (() => {
            const ad = heroAds[1];
            const g = HERO_GRADIENTS[ad.gradient || ''] || HERO_GRADIENTS['purple'];
            const badgeColor = (ad.badge_color && HERO_BADGE_COLORS[ad.badge_color]) || g.badge;
            return (
              <a key={ad.id} href={ad.cta_link || '#'} className="hidden lg:block w-64 flex-shrink-0">
                <Card className={`${g.card} border-0 overflow-hidden hover:opacity-95 transition-opacity`}>
                  <CardContent className="p-0">
                    <div className="relative p-4 text-white">
                      {ad.badge && (
                        <Badge className={`absolute top-2 left-2 ${badgeColor} text-white border-0 text-xs`}>
                          {ad.badge}
                        </Badge>
                      )}
                      <div className="text-4xl mb-2 mt-4">{ad.icon || '🎉'}</div>
                      <h3 className="font-bold text-lg">{ad.title}</h3>
                      {ad.subtitle && <p className={`${g.text} text-sm mb-2`}>{ad.subtitle}</p>}
                      {ad.description && <p className={`${g.text} text-xs mb-3`}>{ad.description}</p>}
                      <Button className={`w-full ${g.button} font-semibold text-sm`}>
                        {ad.cta_text || 'Ver más'}
                      </Button>
                    </div>
                    {ad.footer && (
                      <div className={`${g.footerBg} px-4 py-2 text-center`}>
                        <p className={`text-xs ${g.footerText}`}>{ad.footer}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </a>
            );
          })()}
        </div>
        )}
      </div>
    </div>
  );
};
