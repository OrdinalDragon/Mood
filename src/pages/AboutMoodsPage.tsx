import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface MoodInfo {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  events: string;
  tip: string;
}

const MOODS_INFO: MoodInfo[] = [
  {
    id: 'alegre',
    emoji: '😊',
    label: 'Alegre',
    desc: 'El mood Alegre representa momentos de felicidad, diversión y energía positiva. Es perfecto para cuando querés compartir experiencias vibrantes con otros.',
    events: 'Fiestas, conciertos, celebraciones, reuniones con amigos, eventos deportivos, festivales al aire libre.',
    tip: 'Si estás buscando salir de la rutina y conectar con gente nueva, los eventos Alegre son tu mejor opción.',
  },
  {
    id: 'triste',
    emoji: '😢',
    label: 'Triste',
    desc: 'El mood Triste abarca eventos más melancólicos, reflexivos o emotivos. No todo es negativo — a veces una dosis de profundidad emocional es justo lo que necesitamos.',
    events: 'Cine dramático, charlas inspiradoras, exposiciones de arte emotivo, obras de teatro, eventos de poesía.',
    tip: 'Perfecto para momentos de introspección o cuando querés disfrutar de experiencias culturales con carga emocional.',
  },
  {
    id: 'enojado',
    emoji: '😤',
    label: 'Enojado',
    desc: 'El mood Enojado canaliza la intensidad y la pasión. Es ideal para liberar tensiones a través de actividades enérgicas y competitivas.',
    events: 'Competencias deportivas, torneos, conciertos de rock o metal, eventos de debate, actividades de alta intensidad.',
    tip: 'Una excelente forma de transformar la energía en movimiento. ¡Soltá todo en un evento que te haga vibrar!',
  },
  {
    id: 'tranquilo',
    emoji: '😌',
    label: 'Tranquilo',
    desc: 'El mood Tranquilo invita a la calma y el equilibrio. Es ideal para cuando necesitás frenar, respirar y reconectar con vos mismo en un entorno sereno.',
    events: 'Clases de yoga y meditación, retiros de bienestar, spas, caminatas por la naturaleza, talleres de respiración, cafés tranquilos.',
    tip: 'Cuando sientas que necesitás una pausa, los eventos Tranquilo te ayudan a encontrar ese momento de paz que merecés.',
  },
  {
    id: 'reservado',
    emoji: '🤫',
    label: 'Reservado',
    desc: 'El mood Reservado es para quienes prefieren experiencias tranquilas, íntimas y sin estridencias. Ideal para disfrutar a tu propio ritmo.',
    events: 'Exposiciones de arte, lectura en bibliotecas o librerías, catas de café o vino, talleres de escritura, cine independiente.',
    tip: 'Si tu plan ideal incluye una buena conversación o un momento de silencio compartido, este es tu mood.',
  },
];

const moodGradients: Record<string, string> = {
  alegre: 'from-yellow-400 to-orange-400',
  triste: 'from-blue-400 to-indigo-500',
  enojado: 'from-red-500 to-rose-600',
  tranquilo: 'from-green-400 to-emerald-500',
  reservado: 'from-purple-400 to-violet-500',
};

export const AboutMoodsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sobre los Moods</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            En MOOD, cada evento se asocia a un estado de ánimo. Elegí el que mejor refleje cómo te sentís
            y descubrí experiencias pensadas para vos.
          </p>
        </div>

        <div className="space-y-8">
          {MOODS_INFO.map(mood => (
            <div
              key={mood.id}
              className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
            >
              <div className={`bg-gradient-to-r ${moodGradients[mood.id]} p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{mood.emoji}</span>
                  <div>
                    <h2 className="text-2xl font-bold">{mood.label}</h2>
                    <p className="text-white/80 text-sm">/{mood.id}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {mood.desc}
                </p>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm uppercase tracking-wide">
                    Ejemplos de eventos
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {mood.events}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">Consejo:</span>{' '}
                    {mood.tip}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
