import { Period } from '@prisma/client';
import { db } from '../_lib/prisma';
import { AdminRoomFilters } from '../_components/admin-room-filters';
import { AppSidebar } from '../_components/app-sidebar';
import RoomsManager from '../_components/rooms-manager';
import { SiteHeader } from '../_components/site-header';
import { SidebarProvider, SidebarInset } from '../_components/ui/sidebar';

// Mapa de horários para o cálculo da disponibilidade, ajustado para UTC-3
const periodTimesUTC: {
  [key in Period]: { start: [number, number]; end: [number, number] };
} = {
  MANHA: { start: [10, 30], end: [14, 30] },
  TARDE: { start: [16, 0], end: [20, 0] },
  NOITE: { start: [21, 30], end: [1, 30] },
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

  // Lógica de filtro de disponibilidade por intervalo
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
    include: {
      resources: true,
      images: true,
    },
  });
}

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
  });
  const [locations, types, allResources] = await Promise.all([
    locationsPromise,
    typesPromise,
    resourcesPromise,
  ]);
  return {
    allLocations: locations.map((l) => l.location!),
    allTypes: types.map((t) => t.type!),
    allResources,
  };
}

export default async function AdminRoomsPage({
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
      | Period
      | undefined,
  };

  const [rooms, { allLocations, allTypes, allResources }] = await Promise.all([
    getRooms(filters),
    getFilterData(),
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
        <SiteHeader />
        <div className="p-6 pt-4">
          <RoomsManager initialRooms={rooms} allResources={allResources}>
            <AdminRoomFilters allLocations={allLocations} allTypes={allTypes} />
          </RoomsManager>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
