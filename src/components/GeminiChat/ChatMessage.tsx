import React from 'react';

interface ChatMessageProps {
  role: 'user' | 'model' | 'function';
  content: string;
  name?: string;
  done?: boolean;
}

const FUNCTION_LABELS: Record<string, { busy: string; done: string }> = {
  search_events: { busy: 'Buscando eventos...', done: 'Eventos encontrados' },
  get_event_detail: { busy: 'Obteniendo detalle...', done: 'Detalle obtenido' },
  get_mood_info: { busy: 'Consultando mood...', done: 'Mood consultado' },
  set_user_mood: { busy: 'Cambiando mood...', done: 'Mood actualizado' },
  clear_user_mood: { busy: 'Limpiando mood...', done: 'Mood limpiado' },
  add_to_favorites: { busy: 'Guardando favorito...', done: 'Favorito guardado' },
  share_event: { busy: 'Compartiendo...', done: 'Compartido' },
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, name, done }) => {
  if (role === 'function') {
    const labels = name ? FUNCTION_LABELS[name] : undefined;
    const displayText = done
      ? (labels?.done || 'Listo')
      : (labels?.busy || `${name}...`);

    return (
      <div className="flex justify-center">
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full flex items-center gap-1.5">
          {done ? (
            <span className="w-3 h-3 flex items-center justify-center text-primary text-[10px] font-bold">&#10003;</span>
          ) : (
            <span className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
          )}
          {displayText}
        </div>
      </div>
    );
  }

  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-card-foreground rounded-bl-md'
        }`}
      >
        {content}
      </div>
    </div>
  );
};
