import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { subDays } from 'date-fns';

import { Period, User } from '@prisma/client';
import { db } from '../_lib/prisma';
import { RoomsClientLayout } from './_components/room-client-layout';
import {
  isRecommendationActive,
  recommendRooms,
} from '../_lib/room-recommendation';

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
  availabilityPeriod?: Period | 'INTEGRAL';
  availabilityDayOfWeek?: string;
  students?: number;
  resourceIds?: string[];
}) {
  const {
    name,
    location,
    type,
    capacity,
    availabilityStartDate,
    availabilityEndDate,
    availabilityPeriod,
    availabilityDayOfWeek,
    students,
    resourceIds = [],
  } = filters;

  const whereClause: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (name) whereClause.name = { contains: name, mode: 'insensitive' };
  if (location) whereClause.location = location;
  if (type) whereClause.type = type;
  const minCapacity = Math.max(
    capacity && !isNaN(capacity) ? capacity : 0,
    students && !isNaN(students) ? students : 0,
  );
  if (minCapacity > 0) whereClause.capacity = { gte: minCapacity };

  // --- LÓGICA DE FILTRO DE DISPONIBILIDADE POR INTERVALO ---
  // Apenas executa se todas as 3 condições de disponibilidade forem fornecidas.
  if (availabilityStartDate && availabilityEndDate && availabilityPeriod) {
    const timeSlotsToCheck: { startTime: Date; endTime: Date }[] = [];

    const currentDate = new Date(availabilityStartDate);
    const finalDate = new Date(availabilityEndDate);

    const periodsToCheck: Period[] =
      availabilityPeriod === 'INTEGRAL'
        ? ['MANHA', 'TARDE']
        : [availabilityPeriod as Period];

    while (currentDate <= finalDate) {
      // Se dias da semana foram selecionados, verifica se o dia atual corresponde (0 = Domingo, ..., 6 = Sábado)
      const selectedDays = availabilityDayOfWeek
        ? availabilityDayOfWeek.split(',')
        : [];
      if (
        selectedDays.length === 0 ||
        selectedDays.includes(currentDate.getUTCDay().toString())
      ) {
        for (const p of periodsToCheck) {
          const times = periodTimesUTC[p];
          if (times) {
            const startTimeUTC = new Date(currentDate);
            startTimeUTC.setUTCHours(times.start[0], times.start[1], 0, 0);
            const endTimeUTC = new Date(currentDate);
            endTimeUTC.setUTCHours(times.end[0], times.end[1], 0, 0);
            if (endTimeUTC < startTimeUTC) {
              endTimeUTC.setUTCDate(endTimeUTC.getUTCDate() + 1);
            }
            timeSlotsToCheck.push({
              startTime: startTimeUTC,
              endTime: endTimeUTC,
            });
          }
        }
      }
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

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  const rooms = await db.room.findMany({
    where: whereClause,
    orderBy: { name: 'asc' },
    include: {
      resources: true,
      images: true,
      bookings: {
        where: {
          startTime: { gte: thirtyDaysAgo, lte: now },
          status: { not: 'CANCELLED' },
        },
        select: { startTime: true, period: true },
      },
    },
  });

  // Ocupação = turnos (dia + período) reservados / turnos disponíveis
  // nos últimos 30 dias (segunda a sábado, 3 períodos por dia).
  let workingDays = 0;
  for (let i = 0; i < 30; i++) {
    if (subDays(now, i).getDay() !== 0) workingDays++;
  }
  const availableSlots = workingDays * 3;

  const withOccupancy = rooms.map(({ bookings, ...room }) => {
    const bookedSlots = new Set(
      bookings.map(
        (b) =>
          // UTC-3: converte para o dia local brasileiro
          `${new Date(b.startTime.getTime() - 3 * 3600_000)
            .toISOString()
            .slice(0, 10)}|${b.period}`,
      ),
    );
    return {
      ...room,
      occupancy: Math.min(
        100,
        Math.round((bookedSlots.size / availableSlots) * 100),
      ),
    };
  });

  const criteria = { students, requiredResourceIds: resourceIds };
  if (!isRecommendationActive(criteria)) return withOccupancy;

  return recommendRooms(withOccupancy, criteria);
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

  const resourcesPromise = db.resource.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  const [locations, types, resources] = await Promise.all([
    locationsPromise,
    typesPromise,
    resourcesPromise,
  ]);

  return {
    allLocations: locations.map((l) => l.location!),
    allTypes: types.map((t) => t.type!),
    allResources: resources,
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
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const filters = {
    name: resolvedSearchParams.name,
    location: resolvedSearchParams.location,
    type: resolvedSearchParams.type,
    capacity: resolvedSearchParams.capacity
      ? parseInt(resolvedSearchParams.capacity, 10)
      : undefined,
    availabilityStartDate: resolvedSearchParams.availabilityStartDate,
    availabilityEndDate: resolvedSearchParams.availabilityEndDate,
    availabilityPeriod: resolvedSearchParams.availabilityPeriod as
      Period | undefined,
    availabilityDayOfWeek: resolvedSearchParams.availabilityDayOfWeek,
    students: resolvedSearchParams.students
      ? parseInt(resolvedSearchParams.students, 10)
      : undefined,
    resourceIds: resolvedSearchParams.resources
      ? resolvedSearchParams.resources.split(',').filter(Boolean)
      : undefined,
  };

  const [rooms, { allLocations, allTypes, allResources }, users] =
    await Promise.all([getRooms(filters), getFilterData(), getUsers()]);

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
        <SiteHeader />
        <div className="p-6 pt-4">
          {/* Renderiza o novo componente de cliente, passando todos os dados */}
          <RoomsClientLayout
            initialRooms={rooms}
            allLocations={allLocations}
            allTypes={allTypes}
            allResources={allResources}
            allUsers={users}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
