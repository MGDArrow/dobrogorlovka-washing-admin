import { defineNitroPlugin } from 'nitropack/runtime/plugin';

export default defineNitroPlugin(async () => {
  const bot = getTelegramBot();
  setupBotHandlers(bot);

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('❌ TELEGRAM_WEBHOOK_URL не задан');
    return;
  }

  try {
    await bot.api.setWebhook(webhookUrl, {
      allowed_updates: ['message', 'callback_query'],
    });
    console.log(`✅ Webhook установлен: ${webhookUrl}`);
  } catch (err) {
    console.error('❌ Ошибка установки webhook:', err);
  }
});
