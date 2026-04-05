export default defineEventHandler(async () => {
  try {
    const washTypes = await prisma.washType.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return washTypes;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Ошибка при загрузке типов стирок',
    });
  }
});
