import React, { useRef, useEffect } from 'react';
import { Bot, X, Trash2 } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/hooks/useGeminiChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
  onClear: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isLoading, onSend, onClose, onClear }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <Bot size={14} className="text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-card-foreground">MOOD Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {hasMessages && (
            <button onClick={onClear} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1">MOOD Assistant</p>
            <p className="text-xs max-w-[200px]">
              Preguntame sobre eventos, moods, o pedime que busque planes para vos.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} name={msg.name} done={msg.done} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted text-card-foreground rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  );
};
