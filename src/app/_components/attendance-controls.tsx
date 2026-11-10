'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from './ui/button';

export function AttendanceControls({
  id,
  action = 'confirm',
  onDone,
}: {
  id: string;
  action?: 'confirm' | 'release';
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit() {
    setBusy(true);
    try {
      const response = await fetch(`/api/bookings/${id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      toast.success(result.message);
      router.refresh();
      onDone?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Falha ao registrar a ação.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button
      size="sm"
      variant={action === 'release' ? 'destructive' : 'outline'}
      disabled={busy}
      onClick={() => {
        if (action === 'release')
          toast.warning(
            'Confirmar no-show e liberar somente esta ocorrência?',
            {
              action: {
                label: 'Liberar ocorrência',
                onClick: () => void submit(),
              },
              cancel: { label: 'Voltar', onClick: () => {} },
            },
          );
        else void submit();
      }}
    >
      {busy
        ? 'Salvando…'
        : action === 'release'
          ? 'Liberar ocorrência'
          : 'Confirmar presença'}
    </Button>
  );
}
