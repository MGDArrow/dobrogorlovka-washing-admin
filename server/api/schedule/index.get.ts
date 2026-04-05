import prisma from '../../utils/prisma';

export default defineEventHandler(async () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // работаем в UTC для единообразия

  const currentSchedule = await prisma.schedule.findFirst({
    where: {
      effectiveFrom: {
        lte: today,
      },
    },
    orderBy: {
      effectiveFrom: 'desc',
    },
  });

  return currentSchedule || null;
});
