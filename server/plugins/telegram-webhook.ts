export default defineNitroPlugin(async () => {
  console.log('[Bot plugin] Starting...');
  try {
    console.log('[Bot plugin] Token: ', process.env.TELEGRAM_BOT_TOKEN);
    const bot = getTelegramBot();
    console.log('[Bot plugin] Bot instance created');

    setupBotHandlers(bot);
    console.log('[Bot plugin] Handlers set up');

    await bot.start(); // лучше await, чтобы поймать ошибку старта
    console.log('✅ Bot started in polling mode');
  } catch (err) {
    console.error('[Bot plugin] Fatal error:', err);
    // Не выбрасываем ошибку дальше, чтобы HTTP‑сервер всё же запустился
  }

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, stopping bot...');
    bot?.stop();
  });
  process.on('SIGINT', () => {
    console.log('SIGINT received, stopping bot...');
    bot?.stop();
  });
});
