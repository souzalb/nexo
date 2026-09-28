'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import {
  IconAlertTriangle,
  IconCalendar,
  IconUser,
  IconDoor,
  IconCopy,
} from '@tabler/icons-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

export type ConflictItem = {
  id: string;
  title: string;
  roomName: string | null;
  userName: string | null;
  startTime: string;
  endTime: string;
  classCode: string | null;
};

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictItem[];
  message?: string;
}

export function ConflictModal({
  isOpen,
  onClose,
  conflicts,
  message,
}: ConflictModalProps) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      time: `${date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      })}`,
    };
  };

  const handleCopyConflicts = () => {
    const textToCopy = conflicts
      .map((c, index) => {
        const start = formatDateTime(c.startTime);
        const end = formatDateTime(c.endTime);
        return `Conflito ${index + 1}: ${c.title}
Sala: ${c.roomName || 'N/A'}
Utilizador: ${c.userName || 'N/A'}
Turma: ${c.classCode || 'N/A'}
Data: ${start.date} (${start.time} — ${end.time})
------------------------`;
      })
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    toast.success('Detalhes dos conflitos copiados!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <IconAlertTriangle className="h-5 w-5" />
            Conflitos de Horário Encontrados
          </DialogTitle>
          <DialogDescription>
            {message ||
              `Foram encontrados ${conflicts.length} conflito(s) que impedem esta operação.`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {conflicts.map((conflict, index) => {
            const start = formatDateTime(conflict.startTime);
            const end = formatDateTime(conflict.endTime);

            return (
              <div
                key={conflict.id}
                className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-800/50 dark:bg-red-950/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700 dark:bg-red-900 dark:text-red-300">
                        {index + 1}
                      </span>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {conflict.title}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-1">
                        <IconCalendar className="h-3.5 w-3.5" />
                        {start.date}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {start.time} — {end.time}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-1">
                        <IconDoor className="h-3.5 w-3.5" />
                        {conflict.roomName || 'Sala não definida'}
                      </span>
                      <span className="flex items-center gap-1">
                        <IconUser className="h-3.5 w-3.5" />
                        {conflict.userName || 'Utilizador não definido'}
                      </span>
                    </div>
                  </div>

                  {conflict.classCode && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {conflict.classCode}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <p className="mr-auto self-center text-xs text-gray-500 dark:text-gray-400">
            Resolva os conflitos acima antes de prosseguir.
          </p>
          <Button variant="outline" onClick={handleCopyConflicts}>
            <IconCopy className="mr-2 h-4 w-4" />
            Copiar Conflitos
          </Button>
          <Button variant="default" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
