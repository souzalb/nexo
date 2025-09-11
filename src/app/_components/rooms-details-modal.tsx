'use client';

import { useState, useEffect } from 'react';
import { Resource, RoomImage } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './ui/carousel';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import {
  IconUsers,
  IconBuildingSkyscraper,
  IconTools,
} from '@tabler/icons-react';

// Define o tipo completo de dados que esperamos da API
type RoomDetails = {
  name: string;
  type: string;
  capacity: number;
  resources: Resource[];
  images: RoomImage[];
};

interface RoomDetailsModalProps {
  roomId: string | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function RoomDetailsModal({
  roomId,
  onOpenChange,
}: RoomDetailsModalProps) {
  const [roomData, setRoomData] = useState<RoomDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (roomId) {
      const fetchRoomDetails = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/rooms/${roomId}/details`);
          if (!response.ok)
            throw new Error('Falha ao buscar detalhes da sala.');
          const data = await response.json();
          setRoomData(data);
        } catch (error) {
          console.error(error);
          onOpenChange(false); // Fecha o modal em caso de erro
        } finally {
          setIsLoading(false);
        }
      };
      fetchRoomDetails();
    }
  }, [roomId, onOpenChange]);

  const isOpen = !!roomId;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-5 w-1/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        ) : roomData ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{roomData.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-4 pt-2">
                <span className="flex items-center">
                  <IconBuildingSkyscraper className="mr-1.5 h-4 w-4" />
                  {roomData.type}
                </span>
                <span className="flex items-center">
                  <IconUsers className="mr-1.5 h-4 w-4" />
                  {roomData.capacity} Pessoas
                </span>
              </DialogDescription>
            </DialogHeader>

            {roomData.images.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {roomData.images.map((image) => (
                    <CarouselItem key={image.id}>
                      <img
                        src={image.url}
                        alt={`Foto da sala ${roomData.name}`}
                        className="h-64 w-full rounded-md object-cover"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-2" />
                <CarouselNext className="absolute right-2" />
              </Carousel>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-md bg-slate-100">
                <p className="text-slate-500">Esta sala não tem fotos.</p>
              </div>
            )}

            {roomData.resources.length > 0 && (
              <div className="pt-4">
                <h4 className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                  <IconTools className="mr-2 h-4 w-4" />
                  Recursos Disponíveis
                </h4>
                <div className="flex flex-wrap gap-2">
                  {roomData.resources.map((resource) => (
                    <Badge key={resource.id} variant="secondary">
                      {resource.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p>Não foi possível carregar os detalhes da sala.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
