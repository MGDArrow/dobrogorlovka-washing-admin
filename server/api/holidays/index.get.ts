export default defineEventHandler(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: today,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  return holidays;
});
