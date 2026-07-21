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

        if (response.type === 'function_call') {
          const toolMsg: ChatMessage = {
            role: 'function',
            content: `Ejecutando: ${response.name}`,
            name: response.name,
          };
          addMessage(toolMsg);
          history = [...history, toolMsg];

          if (response.name === 'set_user_mood') {
            setPendingAction({ action: 'set_user_mood', args: response.args });
            setIsLoading(false);
            return;
          }
          if (response.name === 'clear_user_mood') {
            setPendingAction({ action: 'clear_user_mood', args: {} });
            setIsLoading(false);
            return;
          }

          const fn = FUNCTION_MAP[response.name];
          if (!fn) {
            const result = `Función "${response.name}" no encontrada`;
            const resultMsg: ChatMessage = { role: 'function', content: result, name: response.name };
            addMessage(resultMsg);
            history = [...history, resultMsg];
            continue;
          }

          const result = await fn(response.args);
          const resultMsg: ChatMessage = { role: 'function', content: result, name: response.name };
          addMessage(resultMsg);
          history = [...history, resultMsg];

        } else if (response.type === 'text') {
          const modelMsg: ChatMessage = { role: 'model', content: response.content };
          addMessage(modelMsg);
          setIsLoading(false);
          return;
        } else {
          throw new Error('Respuesta inesperada del servidor');
        }
      }

      if (rounds >= MAX_ROUNDS) {
        addMessage({ role: 'model', content: 'Lo siento, no pude completar la operación. Intenta de nuevo.' });
      }
    } catch (err: any) {
      addMessage({ role: 'model', content: `Error: ${err.message || 'Error de conexión'}` });
    } finally {
      if (!pendingAction) setIsLoading(false);
    }
  }, [messages, isLoading, addMessage, sendToBackend, pendingAction]);

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
