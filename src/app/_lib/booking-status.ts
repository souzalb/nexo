// Only active reservations occupy a slot. Historical records remain queryable.
export const activeBookingStatus = {
  in: ['CONFIRMED', 'PENDING'] as ('CONFIRMED' | 'PENDING')[],
};

export function isActiveBooking(status: string) {
  return activeBookingStatus.in.some((value) => value === status);
}
