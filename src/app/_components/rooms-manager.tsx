'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Resource, RoomImage } from '@prisma/client';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { RoomsTable } from './rooms-table';
import { RoomFormModal } from './room-form-modal';
import { IconPlus } from '@tabler/icons-react';

type RoomWithRelations = {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string | null;
  resources: Resource[];
  images: RoomImage[];
};

interface RoomsManagerProps {
  initialRooms: RoomWithRelations[];
  allResources: Resource[];
}

export default function RoomsManager({
  initialRooms,
  allResources,
}: RoomsManagerProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const selectedRoom = selectedRoomId
    ? initialRooms.find((room) => room.id === selectedRoomId)
    : null;

  const handleOpenModal = (room: RoomWithRelations | null) => {
    setSelectedRoomId(room ? room.id : null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedRoomId(null);
    setIsModalOpen(false);
  };

  const handleDeleteRoom = (room: RoomWithRelations) => {
    toast.error(`Tem certeza que deseja excluir a sala "${room.name}"?`, {
      action: {
        label: 'Confirmar Exclusão',
        onClick: async () => {
          try {
            const response = await fetch(`/api/rooms/${room.id}`, {
              method: 'DELETE',
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message);
            }
            toast.success('Sala excluída com sucesso!');
            router.refresh();
          } catch (error) {
            toast.error((error as Error).message);
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => toast.dismiss() },
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Gerenciamento de Salas
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-200">
            Faça o gerenciamento das salas de forma eficiente ou clique no botão
            &ldquo;Adicionar Sala&rdquo; para criar um novo ambiente!.
          </p>
        </div>
        <Button onClick={() => handleOpenModal(null)}>
          <IconPlus />
          Adicionar Sala
        </Button>
      </div>

      <RoomsTable
        rooms={initialRooms}
        onEdit={handleOpenModal}
        onDelete={handleDeleteRoom}
      />

      <RoomFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        room={selectedRoom}
        allResources={allResources}
      />
    </div>
  );
}
