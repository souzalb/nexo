'use client';

import * as React from 'react';
import { Room, Resource, User, RoomImage } from '@prisma/client';
import RoomItem from './room-item';
import { RecurringBookingModal } from '@/app/_components/recurring-booking-modal';
import { RoomFilters } from '@/app/_components/room-filters';

// Define o tipo completo que os componentes filhos esperam
type RoomWithRelations = {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string | null;
  resources: Resource[];
  images: RoomImage[];
};

interface RoomsClientLayoutProps {
  initialRooms: RoomWithRelations[];
  allLocations: string[];
  allTypes: string[];
  allUsers: Pick<User, 'id' | 'name'>[];
}

export function RoomsClientLayout({
  initialRooms,
  allLocations,
  allTypes,
  allUsers,
}: RoomsClientLayoutProps) {
  const [isRequestModalOpen, setIsRequestModalOpen] = React.useState(false);
  const [selectedRoomForRequest, setSelectedRoomForRequest] =
    React.useState<RoomWithRelations | null>(null);

  // Esta função é chamada pelo RoomItem quando o botão "Solicitar Reserva" é clicado.
  // Ela guarda a sala selecionada e abre o modal.
  const handleOpenRequestModal = (room: RoomWithRelations) => {
    setSelectedRoomForRequest(room);
    setIsRequestModalOpen(true);
  };

  // Esta função é chamada pelo modal para se fechar.
  const handleCloseRequestModal = () => {
    setSelectedRoomForRequest(null);
    setIsRequestModalOpen(false);
  };

  return (
    <>
      <RoomFilters allLocations={allLocations} allTypes={allTypes} />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {initialRooms.map((room) => (
          // A função para abrir o modal é passada como prop para cada item da sala.
          <RoomItem
            room={room}
            key={room.id}
            onReserveClick={handleOpenRequestModal}
          />
        ))}
        {initialRooms.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-800">
              Nenhuma sala encontrada
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Tente ajustar os seus filtros ou limpar a seleção.
            </p>
          </div>
        )}
      </div>

      {/* O modal recebe a informação da sala pré-selecionada através da prop `initialRoomId`. */}
      <RecurringBookingModal
        isOpen={isRequestModalOpen}
        onClose={handleCloseRequestModal}
        rooms={initialRooms}
        users={allUsers}
        initialRoomId={selectedRoomForRequest?.id}
      />
    </>
  );
}
