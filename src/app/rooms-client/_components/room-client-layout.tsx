'use client';

import * as React from 'react';
import { Resource, User, RoomImage } from '@prisma/client';
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
  occupancy?: number;
  recommendation?: { score: number; reasons: string[] };
};

interface RoomsClientLayoutProps {
  initialRooms: RoomWithRelations[];
  allLocations: string[];
  allTypes: string[];
  allResources: { id: string; name: string }[];
  allUsers: Pick<User, 'id' | 'name'>[];
}

export function RoomsClientLayout({
  initialRooms,
  allLocations,
  allTypes,
  allResources,
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
      <RoomFilters
        allLocations={allLocations}
        allTypes={allTypes}
        allResources={allResources}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {initialRooms.map((room, index) => (
          // A função para abrir o modal é passada como prop para cada item da sala.
          <RoomItem
            room={room}
            key={room.id}
            onReserveClick={handleOpenRequestModal}
            isBestMatch={index === 0 && !!room.recommendation}
          />
        ))}
        {initialRooms.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Nenhuma sala encontrada
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
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
