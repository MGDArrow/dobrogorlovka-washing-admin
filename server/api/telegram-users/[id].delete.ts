export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '');
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const user = await prisma.telegramUser.update({
    where: { id },
    data: { isActivated: false, activatedAt: null },
  });

  return {
    success: true,
    user: {
      ...user,
      telegramId: user.telegramId.toString(),
      chatId: user.chatId.toString(),
    },
  };
});
