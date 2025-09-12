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

type RoomItemProps = {
  room: {
    resources: {
      name: string;
      id: string;
      createdAt: Date;
      updatedAt: Date;
    }[];
    images: {
      id: string;
      createdAt: Date;
      roomId: string;
      url: string;
    }[];
  } & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    location: string | null;
    capacity: number;
    type: string;
  };
};

const RoomItem = ({ room }: RoomItemProps) => {
  return (
    <Card className="rounded-xl p-0">
      <CardContent className="flex gap-4 p-4">
        <div className="relative min-h-[200px] w-full">
          <Carousel className="w-full">
            <CarouselContent>
              {room.images.map((image) => (
                <CarouselItem key={image.id}>
                  <Image
                    src={image.url}
                    alt={`Foto da sala ${room.name}`}
                    className="h-64 w-full rounded-md object-cover"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-2" />
            <CarouselNext className="absolute right-2" />
          </Carousel>
        </div>
        <div className="flex w-full flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{room.name}</h1>
              <p className="flex items-center text-xs text-gray-600 dark:text-gray-100">
                {room.location}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <p className="text-sm font-semibold">Fantástico</p>
                <p className="text-xs text-gray-500">182 avaliações</p>
              </div>
              <Card className="rounded-bl-sm border-blue-600 bg-blue-500 p-2 text-white shadow-blue-300">
                9,8
              </Card>
            </div>
          </div>

          <div className="mt-4 flex items-center text-sm text-gray-600 dark:text-gray-100">
            <IconBuildingSkyscraper className="mr-1.5 h-4 w-4" />
            <span>{room.type}</span>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600 dark:text-gray-100">
            <IconUsers className="mr-1.5 h-4 w-4" />
            <span>{room.capacity} Pessoas</span>
          </div>

          {room.resources.length > 0 && (
            <div className="mt-4">
              <h4 className="flex items-center text-xs text-gray-600 uppercase dark:text-gray-100">
                <IconTools className="mr-2 h-4 w-4" />
                Recursos Disponíveis:
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
          <Button className="mt-6 bg-blue-500 hover:bg-blue-600 dark:text-white">
            Reservar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomItem;
