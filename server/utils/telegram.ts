import { Bot } from 'grammy';

let botInstance: Bot | null = null;

export function getTelegramBot() {
  if (!botInstance) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN не найден');
    botInstance = new Bot(token);
  }
  return botInstance;
}

export async function sendMessageToUser(chatId: number | string, text: string) {
  const bot = getTelegramBot();
  try {
    await bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
  } catch (err) {
    console.error(`Ошибка отправки сообщения к ${chatId}:`, err);
  }
}

export async function notifyAllActivatedUsers(order: any) {
  const users = await prisma.telegramUser.findMany({
    where: { isActivated: true },
  });

  const message = formatOrderNotification(order);

  for (const user of users) {
    await sendMessageToUser(Number(user.chatId), message);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function formatOrderNotification(order: any): string {
  const washTypes = order.washTypes
    .map((wt: any) => wt.washType.name)
    .join(', ');
  return `
🆕 <b>Новый заказ!</b>

${formatOrderBody(order, washTypes)}
  `.trim();
}

export function formatOrderBody(order: any, washTypesList: any): string {
  return `
🔢 <b>Номер:</b> <code>${formatWashinOrderNumber(order.orderNumber)}</code>
👤 <b>Клиент:</b> ${order.customerName}
📞 <b>Телефон:</b> +${order.customerPhone.replace(/\D/g, '')}
📅 <b>Дата стирки:</b> ${formatDateOrder(order.scheduledAt)}, ${formatTime(order.scheduledAt)}
🧺 <b>Типы стирки:</b> ${washTypesList}
💬 <b>Комментарий:</b> ${order.comment || '—'}
`.trim();
}
