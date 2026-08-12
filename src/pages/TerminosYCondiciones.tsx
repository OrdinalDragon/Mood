/**
 * src/pages/TerminosYCondiciones.tsx - Página de Términos y Condiciones
 */
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { openConsent } from '../lib/consent';

export const TerminosYCondiciones = () => {
  const location = useLocation();

  // Si llegamos con #cookies, scrollear hasta la sección de política de cookies.
  useEffect(() => {
    if (location.hash === '#cookies') {
      document.getElementById('cookies')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header simple */}
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Términos y Condiciones</h1>
        </div>
      </header>

      {/* Contenido */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Última actualización: 5 de mayo de 2026</p>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">1. Aceptación de los Términos</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Al acceder y utilizar la plataforma MOOD, el usuario acepta y se compromete a cumplir con estos Términos y Condiciones. 
              Si no está de acuerdo con alguno de estos términos, le solicitamos que no utilice nuestros servicios.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">2. Definiciones</h2>
            <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
              <li><strong>Plataforma:</strong> Se refiere al sitio web y aplicaciones de MOOD.</li>
              <li><strong>Usuario:</strong> Persona que se registra y utiliza los servicios de MOOD.</li>
              <li><strong>Evento:</strong> Actividad, experiencia o encuentro publicado en la plataforma.</li>
              <li><strong>Contenido:</strong> Textos, imágenes, videos y cualquier otro material publicado por los usuarios.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">3. Registro de Usuarios</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              Para utilizar ciertas funcionalidades de la plataforma, es necesario registrarse creando una cuenta de usuario.
            </p>
            <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
              <li>El usuario debe proporcionar información veraz, exacta y completa.</li>
              <li>El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>El usuario debe ser mayor de 18 años o contar con el consentimiento de sus padres/tutores.</li>
              <li>MOOD se reserva el derecho a rechazar registros o cancelar cuentas a su discreción.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">4. Publicación de Eventos</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              Los usuarios pueden publicar eventos en la plataforma, sujetos a las siguientes condiciones:
            </p>
            <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
              <li>El usuario garantiza que tiene los derechos necesarios para publicar el evento.</li>
              <li>Queda prohibido publicar eventos falsos, engañosos o que infrinjan derechos de terceros.</li>
              <li>MOOD se reserva el derecho de revisar, aprobar o rechazar cualquier evento publicado.</li>
              <li>El usuario es responsable de la veracidad de la información del evento.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">5. Conducta del Usuario</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">El usuario se compromete a:</p>
            <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
              <li>No utilizar la plataforma para fines ilícitos.</li>
              <li>No publicar contenido ofensivo, difamatorio, discriminatorio o inapropiado.</li>
              <li>No acosar, amenazar o hostigar a otros usuarios.</li>
              <li>No intentar vulnerar la seguridad de la plataforma.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">6. Propiedad Intelectual</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Todo el contenido original de MOOD (diseño, código, logos, textos) es propiedad de MOOD y está protegido por leyes de propiedad intelectual. 
              Los usuarios retienen los derechos sobre el contenido que publican, pero otorgan a MOOD una licencia mundial, no exclusiva y gratuita para usar dicho contenido en la plataforma.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">7. Limitación de Responsabilidad</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              MOOD actúa únicamente como una plataforma intermediaria. No organizamos los eventos ni somos responsables de ellos. 
              Los usuarios interactúan bajo su propia responsabilidad. MOOD no se hace responsable por:
            </p>
            <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2 mt-2">
              <li>Daños o perjuicios derivados del uso de la plataforma.</li>
              <li>Contenido inapropiado publicado por terceros.</li>
              <li>Problemas técnicos o interrupciones del servicio.</li>
              <li>Eventos que no cumplan con lo prometido por sus organizadores.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">8. Modificaciones</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              MOOD se reserva el derecho de modificar estos términos en cualquier momento. Se notificará a los usuarios sobre cambios significativos a través de la plataforma o por correo electrónico. 
              El uso continuado de la plataforma tras los cambios constituye la aceptación de los nuevos términos.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">9. Ley Aplicable</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Estos Términos y Condiciones se rigen por las leyes de la República Argentina. Cualquier controversia será sometida a los tribunales competentes de la Ciudad Autónoma de Buenos Aires.
            </p>
          </section>

          <section className="mb-10" id="cookies">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">11. Política de Cookies y Privacidad</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              MOOD utiliza un identificador anónimo en tu navegador (una "cookie") para recopilar
              estadísticas de uso: páginas visitadas, estado de ánimo seleccionado, búsquedas y
              eventos vistos. Esto nos ayuda a entender qué le gusta a la comunidad y a mejorar la plataforma.
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              Los datos son completamente anónimos: tu dirección IP se guarda solo como un hash
              irreversible y nunca se asocia con tu cuenta. Las estadísticas de uso solo se envían
              si aceptás las cookies.
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              Funcionalidades como iniciar sesión, guardar favoritos o publicar eventos NO dependen
              de las cookies de analytics y siguen funcionando aunque las rechaces.
            </p>
            <Button variant="outline" className="gap-2" onClick={openConsent}>
              Gestionar mi consentimiento de cookies
            </Button>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">12. Contacto</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Para preguntas o comentarios sobre estos Términos y Condiciones, puede contactarnos en:
            </p>
            <p className="text-slate-700 dark:text-slate-300 mt-2">
              <strong>Correo electrónico:</strong> moodgrupo6@gmail.com<br />
              <strong>Dirección:</strong> Ciudad Autónoma de Buenos Aires, Argentina
            </p>
            <p className="text-slate-700 dark:text-slate-300 mt-2">
              <strong>Integrantes:</strong> Nicolás Schernetzki, Maylen Speso, Aylén Roldán, Gaston Crespo, Mariano Mendez, Joel Aliendre, German Ramirez, Luciano Bustamante, Diego Ruda, Leonardo Nieto
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-200">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft size={16} />
              Volver al inicio
            </Button>
          </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
