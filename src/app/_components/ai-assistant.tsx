'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  IconMessageChatbot,
  IconSend,
  IconX,
  IconSparkles,
} from '@tabler/icons-react';
import { Button } from './ui/button';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function AiAssistant() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Não renderiza se o usuário não estiver autenticado
  if (!session) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || 'Desculpe, não consegui processar.',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Desculpe, houve um erro. Tente novamente.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Formatar a resposta do assistente, tratando markdown básico
  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700'
        }`}
        aria-label="Abrir assistente IA"
      >
        {isOpen ? (
          <IconX className="h-6 w-6 text-white" />
        ) : (
          <IconMessageChatbot className="h-7 w-7 text-white" />
        )}
      </button>

      {/* Painel do chat */}
      <div
        className={`fixed right-6 bottom-24 z-50 flex w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 ${
          isOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        style={{ height: '520px' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <IconSparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Nexo AI</h3>
            <p className="text-xs text-white/70">Assistente de Reservas</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <IconSparkles className="h-6 w-6 text-violet-500" />
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Olá, {session.user?.name?.split(' ')[0]}! 👋
              </p>
              <p className="mt-1 max-w-[240px] text-xs text-gray-500 dark:text-gray-400">
                Como posso ajudar? Diga algo como: &quot;Quero reservar o Lab 01
                na segunda de manhã&quot;
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  'Quais salas estão disponíveis?',
                  'Reservar uma sala amanhã',
                  'Listar laboratórios',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/40"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-br-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
                    : 'rounded-bl-md border border-gray-100 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                }`}
                dangerouslySetInnerHTML={{
                  __html: formatMessage(msg.content),
                }}
              />
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-violet-400"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-violet-400"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-violet-400"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="max-h-20 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 transition-colors outline-none placeholder:text-gray-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-violet-500"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white transition-all hover:from-violet-600 hover:to-indigo-700 disabled:opacity-40"
            >
              <IconSend className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
