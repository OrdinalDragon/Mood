import { Mail, MapPin, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const ContactPage = () => {

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contacto</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-slate-50 rounded-xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <Mail className="w-6 h-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Correo electrónico</h3>
              <p className="text-slate-600 dark:text-slate-300">ngsrepresentaciones@gmail.com</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MapPin className="w-6 h-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Ubicación</h3>
              <p className="text-slate-600 dark:text-slate-300">Ciudad Autónoma de Buenos Aires, Argentina</p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft size={16} />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};
