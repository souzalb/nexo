'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react';
import { BookingRequestDetailsModal } from './booking-request-modal'; // Verifique se este é o caminho correto
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';

// O tipo precisa de ser completo para ser passado para o modal de detalhes
type BookingRequestWithRelations = {
  id: string;
  classCode: string;
  status: string;
  createdAt: Date;
  startDate: Date;
  endDate: Date;
  timeSlots: string[];
  weekdays: number[];
  user: { name: string | null };
  room: { name: string | null };
  refusalReason: string | null;
};

interface BookingRequestsManagerProps {
  initialRequests: BookingRequestWithRelations[];
}

export function BookingRequestsManager({
  initialRequests,
}: BookingRequestsManagerProps) {
  const router = useRouter();
  const [detailsRequest, setDetailsRequest] =
    useState<BookingRequestWithRelations | null>(null);

  const [isRefusalModalOpen, setIsRefusalModalOpen] = useState(false);
  const [requestToRefuse, setRequestToRefuse] =
    useState<BookingRequestWithRelations | null>(null);
  const [refusalReason, setRefusalReason] = useState('');

  const { pending, approved, refused } = useMemo(() => {
    return initialRequests.reduce(
      (acc, request) => {
        if (request.status === 'PENDENTE') acc.pending.push(request);
        else if (request.status === 'APROVADO') acc.approved.push(request);
        else if (request.status === 'RECUSADO') acc.refused.push(request);
        return acc;
      },
      {
        pending: [] as BookingRequestWithRelations[],
        approved: [] as BookingRequestWithRelations[],
        refused: [] as BookingRequestWithRelations[],
      },
    );
  }, [initialRequests]);

  const handleUpdateRequest = async (
    requestId: string,
    status: 'APROVADO' | 'RECUSADO',
    reason?: string,
  ) => {
    try {
      const response = await fetch(`/api/booking-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, refusalReason: reason }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || 'Falha ao processar a solicitação.');

      toast.success(data.message);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleOpenRefusalModal = (request: BookingRequestWithRelations) => {
    setRequestToRefuse(request);
    setIsRefusalModalOpen(true);
  };

  const handleConfirmRefusal = () => {
    if (requestToRefuse && refusalReason.trim()) {
      handleUpdateRequest(requestToRefuse.id, 'RECUSADO', refusalReason);
      setIsRefusalModalOpen(false);
      setRefusalReason('');
    } else {
      toast.error('Por favor, forneça uma justificação para a recusa.');
    }
  };

  // --- COMPONENTE INTERNO REFATORADO PARA RESPONSIVIDADE ---
  const RequestList = ({
    requests,
  }: {
    requests: BookingRequestWithRelations[];
  }) => (
    <ul className="space-y-4">
      {requests.length > 0 ? (
        requests.map((req) => (
          <li key={req.id}>
            <Card className="w-full p-0">
              <CardContent className="flex flex-col items-start justify-between gap-4 p-4 lg:flex-row lg:items-center">
                {/* Bloco de Informações (Esquerda) */}
                <div className="flex-grow space-y-2">
                  <div className="flex items-center">
                    <p className="font-bold">
                      {req.classCode} -{' '}
                      <span className="font-bold">{req.room.name}</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    Solicitado por: {req.user.name}
                  </p>
                  <div className="flex items-center gap-1 text-sm">
                    <p className="font-semibold">Período:</p>
                    <p>
                      {new Date(req.startDate).toLocaleDateString('pt-BR', {
                        timeZone: 'UTC',
                      })}{' '}
                      -{' '}
                      {new Date(req.endDate).toLocaleDateString('pt-BR', {
                        timeZone: 'UTC',
                      })}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Pedido em: {new Date(req.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>

                {/* Bloco de Ações (Direita) */}
                <div className="flex w-full flex-col gap-4 md:items-end lg:w-auto lg:space-y-8">
                  <div className="flex items-center self-end">
                    <p className="text-sm text-gray-400">Status:</p>
                    {req.status === 'PENDENTE' ? (
                      <Badge className="ml-2 rounded-full bg-amber-200/50 text-yellow-600 dark:bg-amber-500/20 dark:text-amber-400">
                        {req.status}
                      </Badge>
                    ) : req.status === 'APROVADO' ? (
                      <Badge className="ml-2 rounded-full bg-green-200/50 text-green-600 dark:bg-green-200/20 dark:text-green-400">
                        {req.status}
                      </Badge>
                    ) : (
                      <Badge className="ml-2 rounded-full bg-red-200/50 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        {req.status}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailsRequest(req)}
                      className="flex-1 lg:flex-auto"
                    >
                      <IconInfoCircle className="mr-2 h-4 w-4" /> Detalhes
                    </Button>
                    {req.status === 'PENDENTE' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 lg:flex-auto"
                          onClick={() => handleOpenRefusalModal(req)}
                        >
                          <IconX className="mr-2 h-4 w-4" /> Recusar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 lg:flex-auto"
                          onClick={() =>
                            handleUpdateRequest(req.id, 'APROVADO')
                          }
                        >
                          <IconCheck className="mr-2 h-4 w-4" /> Aprovar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))
      ) : (
        <p className="py-8 text-center text-sm text-gray-500">
          Nenhuma solicitação nesta categoria.
        </p>
      )}
    </ul>
  );

  return (
    <>
      <Tabs defaultValue="pendente" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pendente">
            Pendentes ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="aprovado">
            Aprovadas ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="recusado">
            Recusadas ({refused.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pendente">
          <Card className="border-none bg-transparent p-0 shadow-none">
            <CardContent className="p-0">
              <RequestList requests={pending} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="aprovado">
          <Card className="border-none bg-transparent p-0 shadow-none">
            <CardContent className="p-0">
              <RequestList requests={approved} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recusado">
          <Card className="border-none bg-transparent p-0 shadow-none">
            <CardContent className="p-0">
              <RequestList requests={refused} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BookingRequestDetailsModal
        isOpen={!!detailsRequest}
        onClose={() => setDetailsRequest(null)}
        request={detailsRequest}
      />

      <Dialog open={isRefusalModalOpen} onOpenChange={setIsRefusalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Solicitação</DialogTitle>
            <DialogDescription>
              Por favor, forneça uma justificação para a recusa. O solicitante
              será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ex: Conflito de horário com um evento prioritário..."
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRefusalModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmRefusal}>
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
