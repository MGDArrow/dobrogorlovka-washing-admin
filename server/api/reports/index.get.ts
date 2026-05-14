interface ICurrentSchedule {
  id: number;
  effectiveFrom: Date;
  timetableData: { [key: string]: string[] };
  createdAt: Date;
  updatedAt: Date;
}
interface IHoliday {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  date: Date;
}

const weekdays = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const first = query.first as string;
  const last = query.last as string;

  const [currentSchedule, upcomingSchedules, holidays, orders, washTypesData] =
    await Promise.all([
      prisma.schedule.findFirst({
        where: {
          effectiveFrom: {
            lte: first,
          },
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      }),
      prisma.schedule.findMany({
        where: {
          AND: [
            {
              effectiveFrom: {
                gte: first,
              },
            },
            {
              effectiveFrom: {
                lte: last,
              },
            },
          ],
        },
        orderBy: {
          effectiveFrom: 'asc',
        },
      }),
      prisma.holiday.findMany({
        where: {
          AND: [
            {
              date: {
                gte: first,
              },
            },
            {
              date: {
                lte: last,
              },
            },
          ],
        },
        orderBy: {
          date: 'asc',
        },
      }),
      prisma.order.findMany({
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
      }),
      prisma.washType.findMany({
        where: { isActive: true },
        select: { id: true, machineCount: true },
      }),
    ]);

  let allSchedule = getCurrentScheludeDays(
    currentSchedule as ICurrentSchedule | null,
    first,
  );

  upcomingSchedules.forEach((el) => {
    allSchedule = getUpcomingScheludeDays(
      allSchedule,
      el as ICurrentSchedule,
      first,
    );
  });

  getScheludeWithoutHolidays(allSchedule, holidays);

  return allSchedule;
});

function getCurrentScheludeDays(
  current: ICurrentSchedule | null,
  first: string,
) {
  if (current === null) return [];

  const days = Object.entries(current.timetableData);

  const dateTimes: string[] = [];

  days.forEach((day) => {
    const date = getDateForSchedule(
      first,
      weekdays.findIndex((d) => d === day[0]),
    );
    day[1].forEach((time) => {
      dateTimes.push(getTimeForSchedule(date, time).toISOString());
    });
  });
  return dateTimes;
}

function getUpcomingScheludeDays(
  dates: string[],
  upcomingSchedule: ICurrentSchedule,
  first: string,
) {
  // 1. Составить подобное расписание
  const newDates = getCurrentScheludeDays(upcomingSchedule, first);
  // 2. Удалить все даты в новом расписании перед Efectivs
  const newDatesWithDelete = deleteDatesToStart(
    newDates,
    upcomingSchedule.effectiveFrom,
  );
  // 3. Удалить все даты после Efectiv в dates
  const datesWithDelete = deleteDatesToEnd(
    dates,
    upcomingSchedule.effectiveFrom,
  );
  // 4. Concat

  return [...datesWithDelete, ...newDatesWithDelete];
}

function getScheludeWithoutHolidays(dates: string[], holidays: IHoliday[]) {
  holidays.forEach((holiday) => {
    dates.filter((date) => !isCurrentHoliday(date, holiday.date));
  });
}
