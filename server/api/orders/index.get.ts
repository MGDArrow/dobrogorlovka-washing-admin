export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const first = query.first as string;
  const last = query.last as string;

  const orders = await prisma.order.findMany({
    where: {
      scheduledAt: {
        gte: first,
        lte: last,
      },
    },
    include: {
      washTypes: {
        select: {
          washTypeId: true,
        },
      },
    },
  });

  return orders;
});
