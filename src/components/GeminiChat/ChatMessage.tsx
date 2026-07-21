import React from 'react';

interface ChatMessageProps {
  role: 'user' | 'model' | 'function';
  content: string;
  name?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, name }) => {
  if (role === 'function') {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
          {name === 'search_events' && 'Buscando eventos...'}
          {name === 'get_event_detail' && 'Obteniendo detalle...'}
          {name === 'get_mood_info' && 'Consultando mood...'}
          {name !== 'search_events' && name !== 'get_event_detail' && name !== 'get_mood_info' && `Ejecutando...`}
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
