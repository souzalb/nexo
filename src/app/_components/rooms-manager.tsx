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
  children: React.ReactNode;
}

export default function RoomsManager({
  initialRooms,
  allResources,
  children,
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
      {/* --- CABEÇALHO REFATORADO PARA RESPONSIVIDADE --- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Bloco de Título e Descrição */}
        <div className="flex-grow">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Gerenciamento de Salas
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-200">
            Faça o gerenciamento das salas de forma eficiente ou crie um novo
            ambiente.
          </p>
        </div>
        {/* Bloco do Botão */}
        <div className="flex-shrink-0">
          <Button
            onClick={() => handleOpenModal(null)}
            className="w-full md:w-auto" // Ocupa toda a largura no móvel, largura automática no desktop
          >
            <IconPlus className="mr-2 h-4 w-4" />
            Adicionar Sala
          </Button>
        </div>
      </div>

      {/* Renderiza o componente de filtros passado como filho */}
      {children}

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
