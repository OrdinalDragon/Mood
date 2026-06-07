import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdBannerProps {
  variant?: 'sidebar' | 'banner';
  image?: string;
  title: string;
  subtitle?: string;
  description?: string;
  date?: Date;
  location?: string;
  ctaText?: string;
  ctaLink?: string;
  badge?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  variant = 'sidebar',
  image = 'https://picsum.photos/seed/municipalidad/600/400',
  title,
  subtitle,
  description,
  date,
  location,
  ctaText = 'Ver más',
  ctaLink,
  badge
}) => {
  const isSidebar = variant === 'sidebar';
  const content = (
    <Card className={`overflow-hidden ${isSidebar ? 'w-full max-w-[300px]' : 'w-full'}`}>
      <div className={`relative ${isSidebar ? 'h-40' : 'h-48'} bg-gradient-to-br from-blue-600 to-blue-800`}>
        <img 
          src={image}
          alt={title}
          className="w-full h-full object-cover opacity-80"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {badge && (
          <Badge className="absolute top-2 left-2 bg-blue-500 text-white border-0 text-xs">
            {badge}
          </Badge>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white/80 text-xs font-medium uppercase tracking-wide">
            {subtitle}
          </p>
          <h3 className={`font-bold text-white ${isSidebar ? 'text-base' : 'text-lg'}`}>
            {title}
          </h3>
        </div>
      </div>
      
      <CardContent className="p-3">
        {description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-3">{description}</p>
        )}
        
        {date && (
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Calendar size={12} className="text-blue-500" />
            <span>{format(date, "d 'de' MMMM", { locale: es })}</span>
          </div>
        )}
        
        {location && (
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <MapPin size={12} className="text-blue-500" />
            <span>{location}</span>
          </div>
        )}
        
        {ctaLink ? (
          <Link 
            to={ctaLink}
            className="block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium text-center rounded-lg transition-colors"
          >
            {ctaText}
          </Link>
        ) : (
          <span className="block w-full py-2 bg-blue-600 text-white text-sm font-medium text-center rounded-lg">
            {ctaText}
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (ctaLink) {
    return <Link to={ctaLink}>{content}</Link>;
  }
  return content;
};

export const municipalAds = [
  {
    id: 'muni-1',
    badge: 'Municipalidad de MOOD',
    title: 'Festival de la Primavera 2026',
    subtitle: 'Gran evento gratuito',
    description: 'Celebrá el inicio de la primavera con música en vivo, ferias artesanales y actividades para toda la familia.',
    date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    location: 'Plaza Central, Palermo',
    ctaText: 'Inscripción gratuita'
  },
  {
    id: 'muni-2',
    badge: 'Municipalidad de MOOD',
    title: 'Talleres de Oficios 2026',
    subtitle: 'Capacitación gratuita',
    description: 'Aprendé carpintería, electricidad, gastronomía y más. Cupos limitados para vecinos del partido.',
    date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    location: 'Centro Cultural Municipal',
    ctaText: 'Reservá tu lugar'
  },
  {
    id: 'muni-3',
    badge: 'Municipalidad de MOOD',
    title: 'Expo Emprendedores Locales',
    subtitle: 'Feria mensual',
    description: 'Descubrí los mejores productos artesanales y emprendedores de la zona.food trucks y música en vivo.',
    date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    location: 'Predio Ferial, Villa Crespo',
    ctaText: 'Ver emprendedores'
  },
  {
    id: 'muni-4',
    badge: 'Municipalidad de MOOD',
    title: 'Jornadas de Salud Comunitaria',
    subtitle: 'Atención médica gratuita',
    description: 'Chequeos médicos, vaccunación, odontología y orientación nutricional. Sin turno previo.',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    location: 'Hospital Municipal, Caballito',
    ctaText: 'Conocé los servicios'
  },
  {
    id: 'muni-5',
    badge: 'Municipalidad de MOOD',
    title: 'Cine al Aire Libre',
    subtitle: 'Ciclo de películas',
    description: 'Proyección de clásicos del cine argentino bajo las estrellas. Entrada libre y gratuita.',
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    location: 'Parque Rivadavia, Ciudadela',
    ctaText: 'Ver programación'
  },
  {
    id: 'muni-6',
    badge: 'Municipalidad de MOOD',
    title: 'Maratón Popular MOOD 2026',
    subtitle: '5K y 10K',
    description: 'Sumate a la carrera más grande del año. Medias, hidratación y trofeos para los ganadores.',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    location: 'Av. Libertador, Palermo',
    ctaText: 'Registrate ahora'
  }
];
