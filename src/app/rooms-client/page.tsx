import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';

import { Period, User } from '@prisma/client';
import CountRequestsPending from '../_actions/count-requests-pending';
import { db } from '../_lib/prisma';
import { RoomsClientLayout } from './_components/room-client-layout';

// Mapa de horários para o cálculo da disponibilidade, ajustado para UTC-3
const periodTimesUTC: {
  [key in Period]: { start: [number, number]; end: [number, number] };
} = {
  MANHA: { start: [10, 30], end: [14, 30] }, // 07:30 - 11:30 no Brasil
  TARDE: { start: [16, 0], end: [20, 0] }, // 13:00 - 17:00 no Brasil
  NOITE: { start: [21, 30], end: [1, 30] }, // 18:30 - 22:30 no Brasil (termina no dia seguinte em UTC)
};

async function getRooms(filters: {
  name?: string;
  location?: string;
  type?: string;
  capacity?: number;
  availabilityStartDate?: string;
  availabilityEndDate?: string;
  availabilityPeriod?: Period;
}) {
  const {
    name,
    location,
    type,
    capacity,
    availabilityStartDate,
    availabilityEndDate,
    availabilityPeriod,
  } = filters;

  const whereClause: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (name) whereClause.name = { contains: name, mode: 'insensitive' };
  if (location) whereClause.location = location;
  if (type) whereClause.type = type;
  if (capacity && !isNaN(capacity)) whereClause.capacity = { gte: capacity };

  // --- LÓGICA DE FILTRO DE DISPONIBILIDADE POR INTERVALO ---
  // Apenas executa se todas as 3 condições de disponibilidade forem fornecidas.
  if (availabilityStartDate && availabilityEndDate && availabilityPeriod) {
    const timeSlotsToCheck: { startTime: Date; endTime: Date }[] = [];

    const currentDate = new Date(availabilityStartDate);
    const finalDate = new Date(availabilityEndDate);
    const times = periodTimesUTC[availabilityPeriod];

    while (currentDate <= finalDate) {
      const startTimeUTC = new Date(currentDate);
      startTimeUTC.setUTCHours(times.start[0], times.start[1], 0, 0);

      const endTimeUTC = new Date(currentDate);
      endTimeUTC.setUTCHours(times.end[0], times.end[1], 0, 0);

      if (endTimeUTC < startTimeUTC) {
        endTimeUTC.setUTCDate(endTimeUTC.getUTCDate() + 1);
      }

      timeSlotsToCheck.push({ startTime: startTimeUTC, endTime: endTimeUTC });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    if (timeSlotsToCheck.length > 0) {
      const unavailableRoomIdsQuery = {
        where: {
          OR: timeSlotsToCheck.map((slot) => ({
            AND: [
              { startTime: { lt: slot.endTime } },
              { endTime: { gt: slot.startTime } },
            ],
          })),
        },
        select: { roomId: true },
      };

      const bookedRoomIdsPromise = db.booking.findMany(unavailableRoomIdsQuery);

      const [bookedRoomIds] = await Promise.all([bookedRoomIdsPromise]);
      const unavailableRoomIds = [
        ...new Set([...bookedRoomIds].map((b) => b.roomId)),
      ];

      whereClause.id = { notIn: unavailableRoomIds };
    }
  }

  return db.room.findMany({
    where: whereClause,
    orderBy: { name: 'asc' },
    include: { resources: true, images: true },
  });
}

// 2. Busca os dados necessários para os próprios filtros
async function getFilterData() {
  const locationsPromise = db.room.findMany({
    distinct: ['location'],
    where: { location: { not: null } },
    select: { location: true },
    orderBy: { location: 'asc' },
  });
  const typesPromise = db.room.findMany({
    distinct: ['type'],
    where: { type: { not: undefined } },
    select: { type: true },
    orderBy: { type: 'asc' },
  });

  const [locations, types] = await Promise.all([
    locationsPromise,
    typesPromise,
  ]);

  return {
    allLocations: locations.map((l) => l.location!),
    allTypes: types.map((t) => t.type!),
  };
}

// Precisamos de buscar os utilizadores para o modal de reserva
async function getUsers(): Promise<Pick<User, 'id' | 'name'>[]> {
  return db.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}

export default async function RoomsClientPageWrapper({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const filters = {
    name: searchParams.name,
    location: searchParams.location,
    type: searchParams.type,
    capacity: searchParams.capacity
      ? parseInt(searchParams.capacity, 10)
      : undefined,
    availabilityStartDate: searchParams.availabilityStartDate,
    availabilityEndDate: searchParams.availabilityEndDate,
    availabilityPeriod: searchParams.availabilityPeriod as Period | undefined,
  };

  const [rooms, { allLocations, allTypes }, users] = await Promise.all([
    getRooms(filters),
    getFilterData(),
    getUsers(),
  ]);

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader pendingRequestsCount={CountRequestsPending()} />
        <div className="container mx-auto px-4 py-4 md:px-2 md:py-4">
          {/* Renderiza o novo componente de cliente, passando todos os dados */}
          <RoomsClientLayout
            initialRooms={rooms}
            allLocations={allLocations}
            allTypes={allTypes}
            allUsers={users}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
