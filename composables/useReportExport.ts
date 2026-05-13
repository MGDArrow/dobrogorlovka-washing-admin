import type { Order, WashType } from '~~/prisma/generated/client';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import weekday from 'dayjs/plugin/weekday.js';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
import isBetween from 'dayjs/plugin/isBetween.js';

// Подключаем плагины и локаль
dayjs.locale('ru');
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

export function useReportExport() {
  // Вспомогательная: получить все дни недели между start и end
  function getDaysInRange(start: dayjs.Dayjs, end: dayjs.Dayjs): dayjs.Dayjs[] {
    const days: dayjs.Dayjs[] = [];
    let current = start.clone();
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      days.push(current);
      current = current.add(1, 'day');
    }
    return days;
  }

  // Подготовка данных для недельного отчёта (сетка день+время × тип)
  function buildWeekData(
    orders: Order[],
    washTypes: WashType[],
    schedule: { timetableData: Record<string, string[]> },
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
  ) {
    const weekdaysRu = [
      'Понедельник',
      'Вторник',
      'Среда',
      'Четверг',
      'Пятница',
      'Суббота',
      'Воскресенье',
    ];

    function getDayIndex(date: dayjs.Dayjs): number {
      const jsDay = date.day(); // 0=воскресенье, 1=понедельник, ..., 6=суббота
      return jsDay === 0 ? 6 : jsDay - 1;
    }

    const timetable = schedule.timetableData;
    const daysInWeek = getDaysInRange(startDate, endDate);

    // Собираем все слоты
    const allSlots: { dayDate: dayjs.Dayjs; time: string }[] = [];
    for (const day of daysInWeek) {
      const dayIndex = getDayIndex(day);
      const ruDayName = weekdaysRu[dayIndex];
      if (timetable[ruDayName] && Array.isArray(timetable[ruDayName])) {
        for (const time of timetable[ruDayName]) {
          allSlots.push({ dayDate: day, time });
        }
      }
    }

    // Группировка заказов по слотам
    const slotMap = new Map<string, Map<number, number>>();
    for (const order of orders) {
      const orderDate = dayjs(order.scheduledAt);
      const timeKey = orderDate.format('HH:mm');
      const matchingSlot = allSlots.find(
        (slot) =>
          slot.dayDate.isSame(orderDate, 'day') && slot.time === timeKey,
      );
      if (!matchingSlot) continue;

      const slotId = `${matchingSlot.dayDate.format('YYYY-MM-DD')}_${timeKey}`;
      if (!slotMap.has(slotId)) slotMap.set(slotId, new Map());
      const typeMap = slotMap.get(slotId)!;
      for (const wt of order.washTypes) {
        const washTypeId = wt.washTypeId;
        typeMap.set(washTypeId, (typeMap.get(washTypeId) || 0) + 1);
      }
    }

    const typeCols = washTypes.map((wt) => wt.name);
    const header = ['Время / День', ...typeCols, 'Итого за время'];

    const bodyRows: (string | number)[][] = [];
    const dayTotals = new Map<string, number>();
    let grandTotal = 0;

    for (const slot of allSlots) {
      const slotId = `${slot.dayDate.format('YYYY-MM-DD')}_${slot.time}`;
      const typeMap = slotMap.get(slotId) || new Map();
      const row: (string | number)[] = [];
      let slotSum = 0;
      for (const wt of washTypes) {
        const count = typeMap.get(wt.id) || 0;
        row.push(count);
        slotSum += count;
      }
      row.push(slotSum);

      const rowLabel = `${slot.dayDate.format('dd DD.MM')} (${slot.time})`;
      bodyRows.push([rowLabel, ...row]);

      grandTotal += slotSum;
      const dayKey = slot.dayDate.format('YYYY-MM-DD');
      dayTotals.set(dayKey, (dayTotals.get(dayKey) || 0) + slotSum);
    }

    if (bodyRows.length === 0) {
      return {
        header,
        body: [
          [
            'Нет доступных слотов по расписанию',
            ...new Array(header.length - 1).fill(''),
          ],
        ],
      };
    }

    // Группировка по дням и добавление итогов
    const groupedBody: (string | number)[][] = [];
    let currentDay = '';
    let dayRowsBuffer: (string | number)[][] = [];
    for (const row of bodyRows) {
      const rowLabel = row[0] as string;
      const dayFromLabel = rowLabel.split(' ')[1]; // DD.MM
      if (currentDay !== dayFromLabel && dayRowsBuffer.length) {
        const daySum = dayTotals.get(currentDay) || 0;
        const totalRow = [
          `Итого за ${currentDay}`,
          ...new Array(typeCols.length).fill(''),
          daySum,
        ];
        groupedBody.push(...dayRowsBuffer, totalRow);
        dayRowsBuffer = [];
      }
      currentDay = dayFromLabel;
      dayRowsBuffer.push(row);
    }
    if (dayRowsBuffer.length) {
      const daySum = dayTotals.get(currentDay) || 0;
      const totalRow = [
        `Итого за ${currentDay}`,
        ...new Array(typeCols.length).fill(''),
        daySum,
      ];
      groupedBody.push(...dayRowsBuffer, totalRow);
    }

    const grandTotalRow = [
      'Всего за неделю',
      ...new Array(typeCols.length).fill(''),
      grandTotal,
    ];
    groupedBody.push(grandTotalRow);

    return { header, body: groupedBody };
  }

  // Подготовка данных для месячного отчёта (строки – типы стирок, столбцы – дни)
  function buildMonthData(
    orders: Order[],
    washTypes: WashType[],
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
  ) {
    const days = getDaysInRange(startDate, endDate);
    // Заголовок: первый столбец – тип стирки, затем даты, затем итог по типу
    const header = [
      'Тип стирки',
      ...days.map((d) => d.format('DD.MM')),
      'Итого за тип',
    ];

    const typeIndex = new Map<number, number>();
    washTypes.forEach((wt, idx) => typeIndex.set(wt.id, idx));

    // Строки: название типа + массив нулей под даты + итог (пока 0)
    const rows: (string | number)[][] = washTypes.map((wt) => {
      return [wt.name, ...new Array(days.length).fill(0), 0];
    });

    const dayTotals = new Array(days.length).fill(0);

    for (const order of orders) {
      const orderDay = dayjs(order.scheduledAt);
      const dayIdx = days.findIndex((d) => d.isSame(orderDay, 'day'));
      if (dayIdx === -1) continue;

      for (const wt of order.washTypes) {
        const rowIdx = typeIndex.get(wt.washTypeId);
        if (rowIdx !== undefined) {
          // ячейка на пересечении типа и дня
          rows[rowIdx][dayIdx + 1] = (rows[rowIdx][dayIdx + 1] as number) + 1;
          dayTotals[dayIdx] += 1;
        }
      }
    }

    // Вычисляем итог по каждому типу (последний столбец)
    for (let i = 0; i < rows.length; i++) {
      let typeSum = 0;
      for (let j = 1; j <= days.length; j++) {
        typeSum += rows[i][j] as number;
      }
      rows[i][days.length + 1] = typeSum;
    }

    // Строка итогов по дням
    const totalDayRow = [
      'Итого за день',
      ...dayTotals,
      dayTotals.reduce((a, b) => a + b, 0),
    ];
    rows.push(totalDayRow);

    return { header, body: rows };
  }

  // Подготовка данных для годового отчёта (строки – типы, столбцы – месяцы)
  function buildYearData(orders: Order[], washTypes: WashType[], year: number) {
    const monthNames = [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ];
    const header = ['Тип стирки', ...monthNames, 'Итого за тип'];

    const typeIndex = new Map<number, number>();
    washTypes.forEach((wt, idx) => typeIndex.set(wt.id, idx));

    const rows: (string | number)[][] = washTypes.map((wt) => {
      return [wt.name, ...new Array(12).fill(0), 0];
    });

    const monthTotals = new Array(12).fill(0);

    for (const order of orders) {
      const orderMonth = dayjs(order.scheduledAt).month();
      for (const wt of order.washTypes) {
        const rowIdx = typeIndex.get(wt.washTypeId);
        if (rowIdx !== undefined) {
          rows[rowIdx][orderMonth + 1] =
            (rows[rowIdx][orderMonth + 1] as number) + 1;
          monthTotals[orderMonth] += 1;
        }
      }
    }

    for (let i = 0; i < rows.length; i++) {
      let typeSum = 0;
      for (let j = 1; j <= 12; j++) {
        typeSum += rows[i][j] as number;
      }
      rows[i][13] = typeSum;
    }

    const totalMonthRow = [
      'Итого за месяц',
      ...monthTotals,
      monthTotals.reduce((a, b) => a + b, 0),
    ];
    rows.push(totalMonthRow);

    return { header, body: rows };
  }

  // Детальный список заказов
  function buildDetails(orders: Order[], washTypes: WashType[]) {
    const header = ['№', 'Дата и время', 'ФИО', 'Телефон', 'Типы стирок'];
    const body: (string | number)[][] = [];
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const types = order.washTypes
        .map((wt) => washTypes.find((t) => t.id === wt.washTypeId)?.name)
        .filter(Boolean)
        .join(', ');
      const dateTime = dayjs(order.scheduledAt).format('DD.MM.YYYY HH:mm');
      body.push([
        i + 1,
        dateTime,
        order.customerName,
        order.customerPhone,
        types,
      ]);
    }
    return { header, body };
  }

  // Основная функция генерации PDF
  async function generateReport(
    periodType: 'week' | 'month' | 'year',
    start: Dayjs,
    end: Dayjs,
    orders: Order[],
    washTypes: WashType[],
    schedule?: { timetableData: Record<string, string[]> },
  ) {
    if (!orders.length) {
      alert(
        'Нет заказов за выбранный период. Отчёт не может быть сгенерирован.',
      );
      return;
    }
    // Динамический импорт pdfmake
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;

    // pdfMake.vfs = pdfFonts.pdfMake.vfs;

    let mainTable: { header: string[]; body: (string | number)[][] };
    let title = '';
    let orientation: 'portrait' | 'landscape' = 'portrait';

    if (periodType === 'week') {
      if (!schedule)
        throw new Error('Для недельного отчёта необходимо расписание');
      mainTable = buildWeekData(orders, washTypes, schedule, start, end);
      title = `Отчёт за неделю ${start.format('DD.MM.YYYY')} – ${end.format('DD.MM.YYYY')}`;
      orientation = 'landscape'; // чтобы вместить все столбцы
    } else if (periodType === 'month') {
      mainTable = buildMonthData(orders, washTypes, start, end);
      title = `Отчёт за ${start.format('MMMM YYYY')}`;
      orientation = 'landscape';
    } else {
      mainTable = buildYearData(orders, washTypes, start.year());
      title = `Отчёт за ${start.year()} год`;
      orientation = 'landscape';
    }

    const details = buildDetails(orders, washTypes);

    const docDefinition = {
      pageOrientation: orientation,
      content: [
        {
          text: title,
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            body: [mainTable.header, ...mainTable.body],
          },
          layout: 'lightHorizontalLines',
        },
        {
          text: 'Детализация заказов',
          style: 'subheader',
          margin: [0, 30, 0, 10],
          pageBreak: 'before',
        },
        {
          table: {
            headerRows: 1,
            body: [details.header, ...details.body],
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: { fontSize: 16, bold: true },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      },
      defaultStyle: { font: 'Roboto' },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`report_${periodType}_${start.format('YYYY-MM-DD')}.pdf`);
  }

  return { generateReport };
}
