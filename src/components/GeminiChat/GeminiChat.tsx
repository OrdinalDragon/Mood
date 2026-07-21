import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { useMood } from '@/contexts/MoodContext';
import { ChatPanel } from './ChatPanel';
import { useGeminiChat } from '@/hooks/useGeminiChat';

export const GeminiChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { mood: currentMood, setMood, clearMood } = useMood();

  const { messages, isLoading, sendMessage, clearHistory, pendingAction, clearPendingAction } = useGeminiChat({
    currentMood,
    location: 'Argentina',
  });

  useEffect(() => {
    if (pendingAction) {
      if (pendingAction.action === 'set_user_mood') {
        setMood(pendingAction.args.mood_id);
        clearPendingAction();
      } else if (pendingAction.action === 'clear_user_mood') {
        clearMood();
        clearPendingAction();
      }
    }
  }, [pendingAction, setMood, clearMood, clearPendingAction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`fixed z-50 ${isOpen ? 'bottom-0 right-0 left-0 md:bottom-4 md:right-4 md:left-auto md:w-[400px]' : 'bottom-4 right-4'}`}>
        {isOpen ? (
          <div className="h-[80vh] md:h-[550px] md:w-[400px] animate-in slide-in-from-bottom-2 duration-200">
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              onSend={sendMessage}
              onClose={() => setIsOpen(false)}
              onClear={clearHistory}
            />
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 ml-auto bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-xl hover:bg-primary/90 transition-all hover:scale-105"
          >
            <Sparkles size={20} />
            <span className="text-sm font-medium hidden sm:inline">MOOD Assistant</span>
            <MessageCircle size={20} />
          </button>
        )}
      </div>
    </>
  );
};
