'use client';

import { Resource, RoomImage } from '@prisma/client';
import { Button } from '@/app/_components/ui/button';
import { Card, CardContent } from '@/app/_components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/app/_components/ui/carousel';
import {
  IconBuildingSkyscraper,
  IconUsers,
  IconTools,
} from '@tabler/icons-react';
import Image from 'next/image';

type RoomWithRelations = {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string | null;
  resources: Resource[];
  images: RoomImage[];
};

interface RoomItemProps {
  room: RoomWithRelations;
  onReserveClick: (room: RoomWithRelations) => void; // <-- Propriedade adicionada
}

const RoomItem = ({ room, onReserveClick }: RoomItemProps) => {
  return (
    <Card className="flex flex-col overflow-hidden rounded-xl p-0">
      <CardContent className="flex flex-grow flex-col gap-4 p-4 md:flex-row">
        <div className="relative min-h-[200px] w-full md:w-1/2">
          <Carousel className="h-full w-full">
            <CarouselContent>
              {room.images.length > 0 ? (
                room.images.map((image) => (
                  <CarouselItem key={image.id}>
                    <Image
                      src={image.url}
                      alt={`Foto da sala ${room.name}`}
                      className="h-64 w-full rounded-md object-cover"
                      width={357}
                      height={256}
                    />
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem>
                  <div className="flex h-64 w-full items-center justify-center rounded-md bg-slate-100">
                    <span className="text-slate-500">Sem Foto</span>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            {room.images.length > 1 && (
              <>
                <CarouselPrevious className="absolute left-2" />
                <CarouselNext className="absolute right-2" />
              </>
            )}
          </Carousel>
        </div>
        <div className="flex w-full flex-col justify-between md:w-1/2">
          <div>
            <h1 className="text-xl font-bold">{room.name}</h1>
            <p className="flex items-center text-xs text-gray-600 dark:text-gray-100">
              {room.location}
            </p>
            <div className="mt-4 flex items-center text-sm text-gray-600 dark:text-gray-100">
              <IconBuildingSkyscraper className="mr-1.5 h-4 w-4" />
              <span>{room.type}</span>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-100">
              <IconUsers className="mr-1.5 h-4 w-4" />
              <span>{room.capacity} Pessoas</span>
            </div>
            {room.resources.length > 0 && (
              <div className="mt-4">
                <h4 className="flex items-center text-xs font-semibold text-gray-600 uppercase dark:text-gray-100">
                  <IconTools className="mr-2 h-4 w-4" />
                  Recursos
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {room.resources.map((resource) => (
                    <span
                      key={resource.id}
                      className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-200 dark:text-blue-900"
                    >
                      {resource.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            className="mt-6 w-full bg-blue-500 hover:bg-blue-600 dark:text-white"
            onClick={() => onReserveClick(room)}
          >
            Solicitar Reserva
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomItem;
