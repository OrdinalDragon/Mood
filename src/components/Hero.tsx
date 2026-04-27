import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Calendar, Ticket, Star, ArrowRight } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEventCount } from '../lib/sampleEvents';

const PROVINCES = [
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", 
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", 
  "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", 
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"
];

const featuredAds = [
  {
    id: 'hero-1',
    title: 'Gran Sorteo Semanal',
    subtitle: '¡2 entradas VIP!',
    description: 'Participá por entradas para los mejores eventos de la temporada.',
    badge: 'SORTEOS',
    badgeColor: 'bg-red-500',
    gradient: 'from-red-500 to-orange-500',
    icon: '🎟️',
    ctaLink: '/submit',
    ctaLabel: 'Participar ahora'
  },
  {
    id: 'hero-2',
    title: 'Expo Gastronómica',
    subtitle: 'Próximo finde',
    description: 'Más de 100 puestos de comida, shows de cocina en vivo y música.',
    badge: 'DESTACADO',
    badgeColor: 'bg-purple-500',
    gradient: 'from-purple-600 to-pink-500',
    icon: '🍕',
    ctaLink: '/event/sample-6',
    ctaLabel: 'Más información'
  }
];

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

  useEffect(() => {
    const counts: Record<string, number> = {};
    quickLinks.forEach(link => {
      counts[link.filter] = getEventCount(link.filter as any);
    });
    setEventCounts(counts);
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
    <div className="relative overflow-hidden bg-slate-50 py-16 sm:py-24">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-orange-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      <div className="container relative mx-auto px-4">
        <img 
          src="/titulo.png" 
          alt="MOOD" 
          className="w-64 sm:w-80 mx-auto mb-6"
        />
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-4 text-center">
          Explorá tu ciudad
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600 mb-8 text-center">
          Descubrí los mejores eventos, lugares y actividades en Argentina. 
          Filtrá según cómo te sentís hoy y viví experiencias únicas.
        </p>

        <div className="flex items-start justify-center gap-6">
          <a href={featuredAds[0].ctaLink} className="hidden lg:block w-64 flex-shrink-0">
            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-0 overflow-hidden hover:opacity-95 transition-opacity">
              <CardContent className="p-0">
                <div className="relative p-4 text-white">
                  <Badge className={`absolute top-2 left-2 ${featuredAds[0].badgeColor} text-white border-0 text-xs`}>
                    {featuredAds[0].badge}
                  </Badge>
                  <div className="text-4xl mb-2 mt-4">{featuredAds[0].icon}</div>
                  <h3 className="font-bold text-lg">{featuredAds[0].title}</h3>
                  <p className="text-blue-100 text-sm mb-2">{featuredAds[0].subtitle}</p>
                  <p className="text-blue-100 text-xs mb-3">{featuredAds[0].description}</p>
                  <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold text-sm">
                    {featuredAds[0].ctaLabel}
                  </Button>
                </div>
                <div className="bg-blue-900/50 px-4 py-2 text-center">
                  <p className="text-xs text-blue-200">Termina en 2 días 14:32:08</p>
              </div>
            </CardContent>
          </Card>
          </a>

          <div className="flex-1 max-w-4xl">
            <div className="rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 flex flex-col md:flex-row gap-2 mb-4">
              <div className="flex-1 flex items-center px-4 gap-2 border-b md:border-b-0 md:border-r border-slate-100 py-2">
                <MapPin className="text-orange-500" size={20} />
                <Select onValueChange={setProvince}>
                  <SelectTrigger className="border-0 focus:ring-0 shadow-none text-slate-700 font-medium">
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
                <Search className="text-slate-400" size={20} />
                <Input 
                  placeholder="Ciudad o evento..." 
                  className="border-0 focus-visible:ring-0 shadow-none text-slate-700 font-medium"
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
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSuggestionClick(s)}
                        className="w-full text-left px-4 py-2 hover:bg-orange-50 border-b border-slate-100 last:border-0"
                      >
                        <p className="font-medium text-slate-900 text-sm">{s.title}</p>
                        {s.city && <p className="text-xs text-slate-500">{s.city}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleSearch}
                className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-8 h-12 md:h-auto font-bold transition-all hover:scale-105"
              >
                Buscar Planes
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {['Cultural', 'Aventura', 'Relax', 'Nocturno', 'Grupal', 'Individual'].map((tag) => (
                <button 
                  key={tag} 
                  onClick={() => handleCategoryClick(tag)}
                  className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm cursor-pointer"
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
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  <Calendar size={14} />
                  <span className="font-medium">{link.label}</span>
                  <span className="text-slate-400">({eventCounts[link.filter] || 0})</span>
                </button>
              ))}
            </div>
          </div>

          <a href={featuredAds[1].ctaLink} className="hidden lg:block w-64 flex-shrink-0">
            <Card className="bg-gradient-to-br from-purple-600 to-pink-500 border-0 overflow-hidden hover:opacity-95 transition-opacity">
              <CardContent className="p-0">
                <div className="relative p-4 text-white">
                  <Badge className={`absolute top-2 left-2 ${featuredAds[1].badgeColor} text-white border-0 text-xs`}>
                    {featuredAds[1].badge}
                  </Badge>
                  <div className="text-4xl mb-2 mt-4">{featuredAds[1].icon}</div>
                  <h3 className="font-bold text-lg">{featuredAds[1].title}</h3>
                  <p className="text-purple-100 text-sm mb-2">{featuredAds[1].subtitle}</p>
                  <p className="text-purple-100 text-xs mb-3">{featuredAds[1].description}</p>
                  <Button className="w-full bg-white text-purple-600 hover:bg-purple-50 font-semibold text-sm">
                    {featuredAds[1].ctaLabel}
                  </Button>
                </div>
                <div className="bg-purple-900/50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-purple-200">📍 Palermo, BS AS</span>
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
              </div>
            </CardContent>
          </Card>
          </a>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <div className="flex items-center justify-center gap-4 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            +500 eventos activos esta semana
          </div>
          <span className="text-slate-300">•</span>
          <a href="#" className="text-sm text-orange-600 hover:underline whitespace-nowrap">Ver todos los distritos →</a>
        </div>
      </div>
    </div>
  );
};
