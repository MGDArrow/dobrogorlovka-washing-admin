export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params?.id as string);
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Неверный id' });
  }

  await prisma.holiday.delete({
    where: { id },
  });

  return { success: true };
});
