'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Resource, RoomImage } from '@prisma/client';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { RoomsTable } from './rooms-table';
import { RoomFormModal } from './room-form-modal';

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

  // --- CORREÇÃO 1: Guardamos apenas o ID da sala no estado ---
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // --- CORREÇÃO 2: O objeto da sala é sempre derivado das props mais recentes ---
  // Isto garante que, após um router.refresh(), `selectedRoom` terá os novos dados.
  const selectedRoom = selectedRoomId
    ? initialRooms.find((room) => room.id === selectedRoomId)
    : null;

  const handleOpenModal = (room: RoomWithRelations | null) => {
    // --- CORREÇÃO 3: Guardamos o ID, não o objeto ---
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
    <div className="space-y-6 p-5 px-10">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenModal(null)}>+ Adicionar Sala</Button>
      </div>

      <RoomsTable
        rooms={initialRooms}
        onEdit={handleOpenModal}
        onDelete={handleDeleteRoom}
      />

      {/* O modal agora recebe o `selectedRoom` derivado e sempre atualizado */}
      <RoomFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        room={selectedRoom}
        allResources={allResources}
      />
    </div>
  );
}
