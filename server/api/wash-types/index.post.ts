export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { name, description, isActive, temperature, dryingSpin, machineCount } =
    body;

  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Название обязательно' });
  }

  try {
    const newWashType = await prisma.washType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive ?? true,
        temperature: temperature ?? null,
        dryingSpin: dryingSpin ?? null,
        machineCount: machineCount ?? null,
      },
    });
    return newWashType;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        message: 'Название должно быть уникальным',
      });
    }
    throw createError({ statusCode: 500, message: 'Ошибка при создании' });
  }
});
