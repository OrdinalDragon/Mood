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
    badge: 'Exposición MOOD',
    title: 'Proyecto MOOD',
    subtitle: '14 a 17 hs | Entrada gratuita',
    description: 'Te invitamos a la presentación del proyecto MOOD. Conocé cómo la inteligencia artificial transforma la experiencia cultural en Argentina.',
    date: new Date(2026, 5, 9, 14, 0, 0),
    location: 'Auditorio Pampa Energía, Av. Corrientes 515, CABA',
    ctaText: 'Agendá tu visita'
  },
  {
    id: 'muni-2',
    badge: 'Exposición MOOD',
    title: 'Networking y Demos MOOD',
    subtitle: '14 a 17 hs | Demos interactivas',
    description: 'Networking, demos interactivas y espacio de preguntas para inversores, devs y amantes de la tecnología.',
    date: new Date(2026, 5, 9, 14, 0, 0),
    location: 'Auditorio Pampa Energía, Av. Corrientes 515, CABA',
    ctaText: 'Confirmá tu asistencia'
  },
  {
    id: 'muni-3',
    badge: 'Exposición MOOD',
    title: '¡Martes 9 de Junio!',
    subtitle: 'Auditorio Pampa Energía',
    description: 'No te pierdas la exposición del proyecto MOOD de 14 a 17 hs. Entrada libre y gratuita con inscripción previa.',
    date: new Date(2026, 5, 9, 14, 0, 0),
    location: 'Av. Corrientes 515, CABA',
    ctaText: 'Ver detalles'
  },
  {
    id: 'muni-4',
    badge: 'Exposición MOOD',
    title: '¿Cómo llegar?',
    subtitle: 'Auditorio Pampa Energía',
    description: 'El auditorio está en Av. Corrientes 515, CABA. Subte Línea B (estación Carlos Pellegrini), múltiples colectivos. Estacionamiento cercano.',
    date: new Date(2026, 5, 9, 14, 0, 0),
    location: 'Av. Corrientes 515, CABA',
    ctaText: 'Ver mapa'
  },
  {
    id: 'muni-5',
    badge: 'Exposición MOOD',
    title: 'Compartí MOOD',
    subtitle: 'Invita a tus colegas',
    description: 'La entrada es libre y gratuita. Compartí el evento con tus amigos, colegas desarrolladores y emprendedores tecnológicos.',
    date: new Date(2026, 5, 9, 14, 0, 0),
    location: 'Auditorio Pampa Energía, CABA',
    ctaText: 'Compartir evento'
  },
  {
    id: 'muni-6',
    badge: 'Exposición MOOD',
    title: 'Registrate Gratis',
    subtitle: 'Cupos limitados',
    description: 'Completá el formulario para asegurar tu lugar en la exposición. Te esperamos de 14 a 17 hs en el Auditorio de Pampa Energía.',
    date: new Date(2026, 5, 9, 14, 0, 0),
    location: 'Auditorio Pampa Energía, Av. Corrientes 515',
    ctaText: 'Registrarme ahora'
  }
];
