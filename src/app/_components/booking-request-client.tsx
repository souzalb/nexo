'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { IconInfoCircle } from '@tabler/icons-react';
import { BookingRequestDetailsModal } from './booking-request-modal';
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

interface BookingRequestsClientProps {
  initialRequests: BookingRequestWithRelations[];
}

export function BookingRequestsClient({
  initialRequests,
}: BookingRequestsClientProps) {
  const [detailsRequest, setDetailsRequest] =
    useState<BookingRequestWithRelations | null>(null);

  // Separa as solicitações por status para as abas
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

  // Componente interno para renderizar a lista de solicitações
  const RequestList = ({
    requests,
  }: {
    requests: BookingRequestWithRelations[];
  }) => (
    <ul>
      {requests.length > 0 ? (
        requests.map((req) => (
          <li
            key={req.id}
            className="flex flex-col items-start gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <Card className="w-full p-0">
              <CardContent className="flex items-end justify-between p-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <p className="font-bold">
                      {req.classCode} -{' '}
                      <span className="font-bold">{req.room.name}</span>
                    </p>
                  </div>

                  <p className="text-sm font-semibold">
                    Solicitado por: {req.user.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold">Data de início:</p>
                    <p className="text-sm">
                      {new Date(req.startDate).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeZone: 'UTC',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold">Data de término:</p>
                    <p className="text-sm">
                      {new Date(req.endDate).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeZone: 'UTC',
                      })}
                    </p>
                  </div>

                  <p className="text-muted-foreground text-sm">
                    Pedido em: {new Date(req.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex h-full flex-col items-end space-y-20">
                  <div className="flex items-center">
                    <p className="text-sm text-gray-400">Status:</p>
                    {req.status == 'PENDENTE' ? (
                      <Badge className="ml-2 rounded-full bg-amber-200/50 text-yellow-600">
                        {req.status}
                      </Badge>
                    ) : req.status == 'APROVADO' ? (
                      <Badge className="ml-2 rounded-full bg-green-200/50 text-green-600">
                        {req.status}
                      </Badge>
                    ) : (
                      <Badge className="ml-2 rounded-full bg-red-200/50 text-red-600">
                        {req.status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailsRequest(req)}
                    >
                      <IconInfoCircle className="mr-2 h-4 w-4" /> Detalhes
                    </Button>
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
          <Card className="border-none p-0 shadow-none">
            <CardContent className="p-0">
              <RequestList requests={pending} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="aprovado">
          <Card className="border-none p-0 shadow-none">
            <CardContent className="p-0">
              <RequestList requests={approved} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recusado">
          <Card className="border-none p-0 shadow-none">
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
    </>
  );
}
