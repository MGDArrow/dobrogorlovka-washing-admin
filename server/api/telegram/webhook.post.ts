export default defineEventHandler(async (event) => {
  const bot = getTelegramBot();
  const update = await readBody(event);

  await bot.handleUpdate(update);

  return { ok: true };
});
