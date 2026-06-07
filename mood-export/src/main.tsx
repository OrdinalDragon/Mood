/**
 * ============================================================
 * src/main.tsx - Entry Point de la Aplicación
 * ============================================================
 * Punto de entrada principal de React.
 * Renderiza el componente App en el DOM.
 */

// Importaciones de React
import {StrictMode} from 'react';           // Modo estricto para detects problemas
import {createRoot} from 'react-dom/client'; // Crea root de React 18

// Componente principal
import App from './App';

// Estilos globales
import './index.css';

// Obtiene el elemento root del HTML y renderiza la app
// document.getElementById('root') busca el elemento con id="root"
// El simbolo ! indica que no será null
createRoot(document.getElementById('root')!).render(
  // StrictMode ayuda a encontrar problemas en desarrollo
  // Doble invocación de efectos, 检测 deprecated APIs, etc.
  <StrictMode>
    <App />
  </StrictMode>,
);
