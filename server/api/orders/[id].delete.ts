export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string, 10);

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Неверный идентификатор заказа',
    });
  }

  try {
    // Проверяем, существует ли заказ
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Заказ не найден',
      });
    }

    // Удаляем заказ (записи в order_wash_types удалятся каскадно благодаря onDelete: Cascade)
    await prisma.order.delete({
      where: { id },
    });

    return { success: true, message: 'Заказ успешно удалён' };
  } catch (error) {
    console.error('Ошибка удаления заказа:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Ошибка сервера при удалении заказа',
    });
  }
});
