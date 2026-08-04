import { ArrowLeft, Sparkles, QrCode, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const INTEGRANTES = [
  'Nicolás Schernetzki',
  'Maylen Speso',
  'Aylén Roldán',
  'Gaston Crespo',
  'Mariano Mendez',
  'Joel Aliendre',
  'German Ramirez',
  'Luciano Bustamante',
  'Diego Ruda',
  'Leonardo Nieto',
];

export const QuienesSomosPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quiénes somos</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <Sparkles className="w-6 h-6 text-primary mt-1 shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Nuestro proyecto</h3>
              <p className="text-slate-600 dark:text-slate-300">
                MOOD es una plataforma que transforma la forma en que vivís y explorás tu ciudad,
                conectando personas con experiencias locales únicas en toda Argentina. Elegí tu
                estado de ánimo y descubrí eventos hechos para vos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Users className="w-6 h-6 text-primary mt-1 shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Creadores de MOOD
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                {INTEGRANTES.map((nombre) => (
                  <li key={nombre}>{nombre}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <QrCode className="w-6 h-6 text-primary mt-1 shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Probá la demo</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Escaneá el QR para explorar MOOD en tu celular.
              </p>
              <img
                src="/qr-demo.png"
                alt="Código QR de MOOD"
                className="h-40 w-40 rounded-lg bg-white p-2"
              />
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
