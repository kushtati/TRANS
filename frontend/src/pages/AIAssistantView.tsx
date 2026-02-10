// src/pages/AIAssistantView.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Trash2, Sparkles } from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'Quels sont les taux de droits de douane en Guinée pour le régime IM4 ?',
  'Comment calculer la TVA à l\'importation ?',
  'Quelles sont les étapes du dédouanement au port de Conakry ?',
  'Quelle est la différence entre IM4 et IM7 ?',
  'Comment obtenir un BAE (Bon à Enlever) ?',
];

export const AIAssistantView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content?: string) => {
    const text = content || input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post<{ response: string }>('/ai/chat', {
        message: text,
        history: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.data?.response || 'Désolé, je n\'ai pas pu générer de réponse.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg = error instanceof ApiError ? error.message : 'Erreur de connexion';
      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${errorMsg}. Veuillez réessayer.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-violet-600" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-800">Assistant IA</h1>
              <p className="text-xs text-slate-500">Aide au transit et dédouanement</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
              title="Effacer la conversation"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
              <Bot size={28} className="text-violet-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-2">
              Comment puis-je vous aider ?
            </h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              Posez-moi des questions sur le transit maritime, le dédouanement, les calculs de droits, ou la réglementation guinéenne.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-colors text-slate-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <Bot size={16} className="text-violet-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <User size={16} className="text-blue-600" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
              <Bot size={16} className="text-violet-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={18} className="animate-spin text-violet-500" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question..."
            rows={1}
            className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent max-h-32"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
