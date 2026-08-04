import { useState, useCallback, useEffect, useRef } from 'react';
import { FUNCTION_MAP } from '@/lib/gemini-functions';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const STORAGE_KEY = 'gemini_chat_history';
const MAX_ROUNDS = 3;
const MAX_HISTORY = 20;

export interface ChatMessage {
  role: 'user' | 'model' | 'function';
  content: string;
  name?: string;
  done?: boolean;
}

interface UseGeminiChatOptions {
  currentMood?: string | null;
  location?: string;
}

interface UseGeminiChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
  pendingAction: { action: string; args: Record<string, any> } | null;
  clearPendingAction: () => void;
}

export function useGeminiChat({ currentMood, location }: UseGeminiChatOptions = {}): UseGeminiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; args: Record<string, any> } | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch {}
  }, [messages]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const sendToBackend = useCallback(async (history: ChatMessage[]): Promise<any> => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/gemini/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        history: history.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.name ? { name: m.name } : {}),
        })),
        context: {
          currentMood: currentMood || null,
          location: location || '',
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return res.json();
  }, [currentMood, location]);

  const sendMessage = useCallback(async (text: string) => {
    if (isLoading || !text.trim()) return;
    abortRef.current = false;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    addMessage(userMsg);
    setIsLoading(true);

    try {
      let history = [...messages, userMsg];
      let rounds = 0;

      while (rounds < MAX_ROUNDS && !abortRef.current) {
        rounds++;
        const response = await sendToBackend(history);

        const calls: { name: string; args: Record<string, any> }[] = [];

        if (response.type === 'function_calls' && response.calls?.length) {
          calls.push(...response.calls);
        } else if (response.type === 'function_call') {
          calls.push({ name: response.name, args: response.args });
        } else if (response.type === 'text') {
          addMessage({ role: 'model', content: response.content });
          return;
        } else {
          throw new Error('Respuesta inesperada del servidor');
        }

        let specialAction: { action: string; args: Record<string, any> } | null = null;

        for (const call of calls) {
          addMessage({
            role: 'function', content: call.name, name: call.name, done: false,
          } as any);

          if (call.name === 'set_user_mood') {
            specialAction = { action: 'set_user_mood', args: call.args };
            setMessages(prev => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'function' && updated[i].name === call.name && !updated[i].done) {
                  updated[i] = { ...updated[i], content: call.name, done: true };
                  break;
                }
              }
              return updated;
            });
            history = [...history, { role: 'function', content: JSON.stringify({ mood_id: call.args.mood_id }), name: call.name }];
            continue;
          }
          if (call.name === 'clear_user_mood') {
            specialAction = { action: 'clear_user_mood', args: {} };
            setMessages(prev => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'function' && updated[i].name === call.name && !updated[i].done) {
                  updated[i] = { ...updated[i], content: call.name, done: true };
                  break;
                }
              }
              return updated;
            });
            history = [...history, { role: 'function', content: '{"cleared":true}', name: call.name }];
            continue;
          }

          const fn = FUNCTION_MAP[call.name];
          if (!fn) {
            const errResult = `Función "${call.name}" no encontrada`;
            setMessages(prev => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'function' && updated[i].name === call.name && !updated[i].done) {
                  updated[i] = { ...updated[i], content: errResult, done: true };
                  break;
                }
              }
              return updated;
            });
            history = [...history, { role: 'function', content: errResult, name: call.name }];
            continue;
          }

          try {
            const result = await fn(call.args);
            setMessages(prev => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'function' && updated[i].name === call.name && !updated[i].done) {
                  updated[i] = { ...updated[i], content: result, done: true };
                  break;
                }
              }
              return updated;
            });
            history = [...history, { role: 'function', content: result, name: call.name }];
          } catch (fnErr) {
            const errResult = `Error al ejecutar ${call.name}`;
            setMessages(prev => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'function' && updated[i].name === call.name && !updated[i].done) {
                  updated[i] = { ...updated[i], content: errResult, done: true };
                  break;
                }
              }
              return updated;
            });
            history = [...history, { role: 'function', content: errResult, name: call.name }];
          }
        }

        if (specialAction) {
          setPendingAction(specialAction);
        }
      }

      addMessage({ role: 'model', content: 'Encontré algunas opciones para vos. ¿Querés que te cuente más sobre alguno?' });
    } catch (err: any) {
      addMessage({ role: 'model', content: `Error: ${err.message || 'Error de conexión'}` });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, addMessage, sendToBackend]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, clearHistory, pendingAction, clearPendingAction };
}
