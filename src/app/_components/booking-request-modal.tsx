'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

type BookingRequestWithRelations = {
  id: string;
  classCode: string;
  status: string;
  startDate: Date;
  endDate: Date;
  timeSlots: string[];
  weekdays: number[];
  user: { name: string | null };
  room: { name: string | null };
};

interface BookingRequestDetailsModalProps {
  request: BookingRequestWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

const weekdayMap: { [key: number]: string } = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
  0: 'Dom',
};
const timeSlotMap: { [key: string]: string } = {
  MANHA_INTEIRO: 'Manhã',
  TARDE_INTEIRO: 'Tarde',
  NOITE_INTEIRO: 'Noite',
  INTEGRAL: 'Integral',
};

export function BookingRequestDetailsModal({
  request,
  isOpen,
  onClose,
}: BookingRequestDetailsModalProps) {
  if (!request) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return 'success';
      case 'RECUSADO':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[25%] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da Solicitação</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4 text-sm">
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Turma:</span>
            <span className="col-span-2 font-medium">{request.classCode}</span>
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Status:</span>
            <div className="col-span-2">
              <Badge
                variant={getStatusVariant(request.status) as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                className="rounded-full"
              >
                {request.status}
              </Badge>
            </div>
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Solicitante:</span>
            <span className="col-span-2 font-medium">{request.user.name}</span>
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Sala:</span>
            <span className="col-span-2 font-medium">{request.room.name}</span>
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Período:</span>
            <span className="col-span-2 font-medium">
              {new Date(request.startDate).toLocaleDateString('pt-BR', {
                timeZone: 'UTC',
              })}{' '}
              até{' '}
              {new Date(request.endDate).toLocaleDateString('pt-BR', {
                timeZone: 'UTC',
              })}
            </span>
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Dias da Semana:</span>
            <div className="col-span-2 flex flex-wrap gap-1">
              {request.weekdays.map((day) => (
                <Badge key={day} variant="outline">
                  {weekdayMap[day]}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Horários:</span>
            <div className="col-span-2 flex flex-wrap gap-1">
              {request.timeSlots.map((slot) => (
                <Badge key={slot} variant="outline">
                  {timeSlotMap[slot] || slot}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
