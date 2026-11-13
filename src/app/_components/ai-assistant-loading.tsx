'use client';
import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

export function AiAssistantLoading({ submitting }: { submitting: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="bg-primary/5 border-primary/15 mt-5 overflow-hidden rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex size-10 shrink-0 items-center justify-center">
          <span className="border-primary/20 border-t-primary absolute inset-0 rounded-full border-2 motion-safe:animate-spin" />
          {submitting ? (
            <Loader2 className="text-primary size-4" />
          ) : (
            <Search className="text-primary size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p role="status" className="text-sm font-medium">
            {submitting
              ? 'Enviando sua confirmação…'
              : seconds >= 20
                ? 'Ainda processando sua consulta…'
                : 'Procurando a melhor opção para você…'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {submitting
              ? 'Aguarde o resultado antes de enviar novamente.'
              : seconds >= 20
                ? 'A consulta está levando um pouco mais de tempo. Você pode continuar nesta tela.'
                : 'Considerando seu pedido e os critérios da busca.'}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="text-muted-foreground text-xs tabular-nums"
        >
          {seconds}s
        </span>
      </div>
      <div aria-hidden="true" className="mt-4 space-y-2 pl-[52px]">
        <div className="bg-primary/10 h-2 w-4/5 rounded-full motion-safe:animate-pulse" />
        <div
          className="bg-primary/10 h-2 w-3/5 rounded-full motion-safe:animate-pulse"
          style={{ animationDelay: '250ms' }}
        />
      </div>
    </div>
  );
}
