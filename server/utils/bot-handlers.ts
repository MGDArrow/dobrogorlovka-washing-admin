import { Bot } from 'grammy';
import { formatOrderBody } from './telegram';
import prisma from '../utils/prisma';

const SECRET_WORD = process.env.SECRET_WORD;

async function getOrdersForDate(dateStr: string, ctx: any) {
  // Парсим дату в формате ДД.ММ.ГГГГ
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // месяцы в JS 0-11
  const year = parseInt(parts[2], 10);
  const startDate = new Date(year, month, day, 0, 0, 0);
  const endDate = new Date(year, month, day, 23, 59, 59);

  if (isNaN(startDate.getTime())) return null;

  const orders = await prisma.order.findMany({
    where: {
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      washTypes: {
        include: { washType: true },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  if (orders.length === 0) {
    await ctx.reply(`📭 На ${dateStr} заказов нет.`);
    return;
  }

  // Группировка заказов по времени (HH:MM)
  const grouped = new Map<string, typeof orders>();
  for (const order of orders) {
    const timeKey = new Date(order.scheduledAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (!grouped.has(timeKey)) grouped.set(timeKey, []);
    grouped.get(timeKey)!.push(order);
  }

  // Формируем сообщение
  let reply = `📅 <b>Заказы на ${dateStr}</b>\n\n`;
  for (const [time, ordersAtTime] of grouped.entries()) {
    reply += `🕒 <b>${time}</b>\n`;
    for (const order of ordersAtTime) {
      const washTypesList = order.washTypes
        .map((wt: any) => wt.washType.name)
        .join(', ');
      const phoneDigits = order.customerPhone.replace(/\D/g, '');
      reply += `   • №<code>${formatWashinOrderNumber(order.orderNumber)}</code> | ${order.customerName} | +${phoneDigits} | ${washTypesList} | ${order.comment || '—'}\n`;
    }
    reply += '\n';
  }
  await ctx.reply(reply, { parse_mode: 'HTML' });
}

export function setupBotHandlers(bot: Bot) {
  bot.on('message:text', async (ctx) => {
    console.log(`New message: ${ctx.message.text}`);
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const text = ctx.message?.text?.trim();

    if (!userId || !chatId) return;

    // 1. Получаем или создаём пользователя
    let user = await prisma.telegramUser.findUnique({
      where: { telegramId: userId },
    });

    if (!user) {
      user = await prisma.telegramUser.create({
        data: {
          telegramId: userId,
          chatId: chatId,
          firstName: ctx.from.first_name,
          username: ctx.from.username,
        },
      });
    }

    // 2. Активация
    if (text === SECRET_WORD) {
      if (!user.isActivated) {
        await prisma.telegramUser.update({
          where: { id: user.id },
          data: { isActivated: true, activatedAt: new Date() },
        });
        await ctx.reply(
          '✅ Доступ активирован! Теперь вы можете искать заказы и получать уведомления.',
        );
      } else {
        await ctx.reply('⚠️ Ваш аккаунт уже активирован.');
      }
      return;
    }

    // 3. Неактивированный пользователь
    if (!user.isActivated) {
      await ctx.reply('🔒 Доступ закрыт. Данный бот является частным.');
      return;
    }

    // 4. Обработка команды /today или "Сегодня" (регистронезависимо)
    const lowerText = text?.toLowerCase();
    if (lowerText === '/today' || lowerText === 'сегодня') {
      const today = new Date();
      const todayStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
      await getOrdersForDate(todayStr, ctx);
      return;
    }

    // 5. Обработка поиска по номеру заказа
    let orderNumber: string | null = null;

    if (text?.startsWith('/search')) {
      const parts = text.split(/\s+/);
      if (parts[1]) {
        orderNumber = parts[1].replace(/\D/g, '');
      }
    } else if (text && /^\d{6}$|^\d{3}-\d{3}$/.test(text)) {
      orderNumber = text.replace(/\D/g, '');
    }

    if (orderNumber && orderNumber.length === 6) {
      const order = await prisma.order.findUnique({
        where: { orderNumber: orderNumber },
        include: { washTypes: { include: { washType: true } } },
      });

      if (order) {
        const washTypesList = order.washTypes
          .map((wt: any) => wt.washType.name)
          .join(', ');
        const reply = `🔍 <b>Заказ найден</b>\n\n${formatOrderBody(order, washTypesList)}`;
        await ctx.reply(reply, { parse_mode: 'HTML' });
      } else {
        await ctx.reply('❌ Заказ с таким номером не найден.');
      }
      return;
    }

    // 6. Обработка даты в формате ДД.ММ.ГГГГ
    const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    if (text && dateRegex.test(text)) {
      await getOrdersForDate(text, ctx);
      return;
    }

    // 7. Неизвестная команда
    await ctx.reply(
      '🤖 Доступные команды:\n' +
        '• <code>123456</code> или <code>123-456</code> – поиск заказа\n' +
        '• <code>31.12.2026</code> – список заказов на указанную дату\n' +
        '• <code>/today</code> или <code>Сегодня</code> – список заказов на сегодня',
      { parse_mode: 'HTML' },
    );
  });
}
