import prisma from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { effectiveFrom, timetable } = body;

  if (!effectiveFrom || !timetable) {
    throw createError({
      statusCode: 400,
      message: 'Отсутствие эффективного результата или расписания',
    });
  }

  const [year, month, day] = effectiveFrom.split('-').map(Number);
  const newDate = new Date(Date.UTC(year, month - 1, day));

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  if (newDate < todayUTC) {
    throw createError({
      statusCode: 400,
      message: 'Дата вступления в силу не может быть перенесена в прошлое',
    });
  }

  try {
    const schedule = await prisma.schedule.upsert({
      where: { effectiveFrom: newDate },
      update: { timetableData: timetable },
      create: {
        effectiveFrom: newDate,
        timetableData: timetable,
      },
    });
    return schedule;
  } catch (error: any) {
    console.error('Prisma error:', error);
    throw createError({
      statusCode: 500,
      message: 'Не удалось сохранить расписание',
    });
  }
});
