import { defineEventHandler, getRouterParam } from 'h3';

export default defineEventHandler(async (event) => {
  const rawOrderNumber = getRouterParam(event, 'orderNumber');

  if (!rawOrderNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order number is required',
    });
  }
  const normalizedNumber = rawOrderNumber.replace(/\D/g, '');

  if (normalizedNumber.length !== 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order number must contain 6 digits',
    });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: normalizedNumber },
    include: {
      washTypes: {
        include: {
          washType: true,
        },
      },
    },
  });

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' });
  }

  return order;
});
