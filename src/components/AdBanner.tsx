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
      <div className={`relative ${isSidebar ? 'h-40' : 'h-48'} bg-gradient-to-br from-primary to-primary/80`}>
        <img 
          src={image}
          alt={title}
          className="w-full h-full object-cover opacity-80"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {badge && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground border-0 text-xs">
            {badge}
          </Badge>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
            {subtitle}
          </p>
          <h3 className={`font-bold text-primary-foreground ${isSidebar ? 'text-base' : 'text-lg'}`}>
            {title}
          </h3>
        </div>
      </div>
      
      <CardContent className="p-3">
        {description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{description}</p>
        )}
        
        {date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Calendar size={12} className="text-primary" />
            <span>{format(date, "d 'de' MMMM", { locale: es })}</span>
          </div>
        )}
        
        {location && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <MapPin size={12} className="text-primary" />
            <span>{location}</span>
          </div>
        )}
        
        {ctaLink ? (
          <Link 
            to={ctaLink}
            className="block w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium text-center rounded-lg transition-colors"
          >
            {ctaText}
          </Link>
        ) : (
          <span className="block w-full py-2 bg-primary text-primary-foreground text-sm font-medium text-center rounded-lg">
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
