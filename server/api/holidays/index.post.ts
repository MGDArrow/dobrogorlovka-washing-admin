export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { date } = body;

  if (!date) {
    throw createError({ statusCode: 400, message: 'Дата обязательна' });
  }

  // Нормализуем дату (начало дня)
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  // Валидация: дата не должна быть в прошлом
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (normalizedDate < today) {
    throw createError({
      statusCode: 400,
      message: 'Дата не может быть в прошлом',
    });
  }

  // Проверяем, не существует ли уже такой даты
  const existing = await prisma.holiday.findUnique({
    where: { date: normalizedDate },
  });
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Этот день уже является выходным',
    });
  }

  const holiday = await prisma.holiday.create({
    data: { date: normalizedDate },
  });

  return holiday;
});
