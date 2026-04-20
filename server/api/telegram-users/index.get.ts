export default defineEventHandler(async () => {
  const users = await prisma.telegramUser.findMany({
    where: { isActivated: true },
    orderBy: { activatedAt: 'desc' },
  });

  return users.map((user) => ({
    ...user,
    telegramId: user.telegramId.toString(),
    chatId: user.chatId.toString(),
  }));
});
