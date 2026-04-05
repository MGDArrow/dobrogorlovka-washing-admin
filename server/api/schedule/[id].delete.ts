import prisma from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Schedule ID is required',
    });
  }

  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: Number(id) },
    });

    if (!schedule) {
      throw createError({
        statusCode: 404,
        message: 'Schedule not found',
      });
    }

    await prisma.schedule.delete({
      where: { id: Number(id) },
    });

    return { success: true, message: 'Schedule deleted' };
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to delete schedule',
    });
  }
});
