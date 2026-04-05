import prisma from '../../utils/prisma';

export default defineEventHandler(async () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const upcomingSchedules = await prisma.schedule.findMany({
    where: {
      effectiveFrom: {
        gt: today,
      },
    },
    orderBy: {
      effectiveFrom: 'asc',
    },
  });

  return upcomingSchedules;
});
