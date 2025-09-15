import { db } from '../_lib/prisma';

const pendingRequestsCountPromise = db.bookingRequest.count({
  where: { status: 'PENDENTE' },
});

const [pendingRequestsCount] = await Promise.all([pendingRequestsCountPromise]);

const CountRequestsPending = () => {
  return pendingRequestsCount;
};

export default CountRequestsPending;
