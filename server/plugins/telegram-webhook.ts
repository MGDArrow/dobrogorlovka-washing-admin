import { defineNitroPlugin } from 'nitropack/runtime/plugin';
import { setupBotHandlers } from '../utils/bot-handlers';

export default defineNitroPlugin(async () => {
  const bot = getTelegramBot();

  setupBotHandlers(bot);

  bot
    .start()
    .then(() => console.log('✅ Bot started in polling mode'))
    .catch((err) => console.error('Bot polling error:', err));

  process.on('beforeExit', () => {
    bot.stop();
  });
});
