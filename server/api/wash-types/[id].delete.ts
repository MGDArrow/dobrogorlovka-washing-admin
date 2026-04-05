export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string);
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Некорректный ID' });
  }

  try {
    await prisma.washType.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'Тип стирки не найден' });
    }
    throw createError({ statusCode: 500, message: 'Ошибка при удалении' });
  }
});
