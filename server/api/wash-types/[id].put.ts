export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string);
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Некорректный ID' });
  }

  const body = await readBody(event);
  const { name, description, isActive, temperature, dryingSpin, machineCount } =
    body;

  try {
    const updated = await prisma.washType.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description:
          description !== undefined ? description?.trim() || null : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        temperature:
          temperature !== undefined ? (temperature ?? null) : undefined,
        dryingSpin: dryingSpin !== undefined ? (dryingSpin ?? null) : undefined,
        machineCount:
          machineCount !== undefined ? (machineCount ?? null) : undefined,
      },
    });
    return updated;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        message: 'Название должно быть уникальным',
      });
    }
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Тип стирки не найден' });
    }
    throw createError({ statusCode: 500, message: 'Ошибка при обновлении' });
  }
});
