export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  try {
    await notifyAllActivatedUsers(body);
    return;
  } catch (error: any) {
    console.error('Prisma error:', error);
    throw createError({
      statusCode: 500,
      message: 'Не удалось сделать рассылку заказа',
    });
  }
});
