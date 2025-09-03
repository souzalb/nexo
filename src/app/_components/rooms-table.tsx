'use client';

import { Resource, RoomImage } from '@prisma/client';
import { Button } from './ui/button';
import {
  IconEdit,
  IconTrash,
  IconUsers,
  IconMapPin,
  IconBuildingSkyscraper,
  IconTools,
} from '@tabler/icons-react';
import React from 'react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';

// Define o tipo de dados esperado pela tabela
type RoomWithRelations = {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string | null;
  resources: Resource[];
  images: RoomImage[];
};

interface RoomsTableProps {
  rooms: RoomWithRelations[];
  onEdit: (room: RoomWithRelations) => void;
  onDelete: (room: RoomWithRelations) => void;
}

export function RoomsTable({ rooms, onEdit, onDelete }: RoomsTableProps) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h3 className="text-xl font-semibold text-gray-800">
          Nenhuma sala encontrada
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Comece por adicionar uma nova sala para a poder gerir aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room) => (
        <div
          key={room.id}
          className="flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg"
        >
          <div className="relative">
            <Image
              src={
                room.images[0]?.url ||
                'https://placehold.co/600x400/e2e8f0/64748b?text=Sem+Foto'
              }
              alt={`Foto da ${room.name}`}
              className="h-56 w-full object-cover"
            />
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(room)}
                  >
                    <IconEdit className="h-5 w-5 text-gray-500 hover:text-gray-800" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(room)}
                  >
                    <IconTrash className="h-5 w-5 text-red-500 hover:text-red-700" />
                  </Button>
                </div>
              </div>

              {room.location && (
                <p className="mt-1 flex items-center text-sm text-gray-500">
                  <IconMapPin className="mr-2 h-4 w-4" />
                  {room.location}
                </p>
              )}

              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <IconBuildingSkyscraper className="mr-1.5 h-4 w-4" />
                  <span>{room.type}</span>
                </div>
                <div className="flex items-center">
                  <IconUsers className="mr-1.5 h-4 w-4" />
                  <span>{room.capacity} Pessoas</span>
                </div>
              </div>

              {room.resources.length > 0 && (
                <div className="mt-4">
                  <h4 className="flex items-center text-xs font-semibold text-gray-500 uppercase">
                    <IconTools className="mr-2 h-4 w-4" />
                    Recursos Disponíveis
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {room.resources.map((resource) => (
                      <span
                        key={resource.id}
                        className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800"
                      >
                        {resource.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
