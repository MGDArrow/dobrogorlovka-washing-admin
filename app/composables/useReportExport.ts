import type { Order, WashType } from '~~/prisma/generated/client';
import dayjs, { Dayjs } from 'dayjs';
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
    schedule: string[], // массив ISO-строк (дата + время)
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
  ) {
    const daysInWeek = getDaysInRange(startDate, endDate);

    // 1. Преобразуем schedule в карту: дата -> массив времен (HH:mm)
    const slotTimesByDate = new Map<string, string[]>();
    for (const iso of schedule) {
      const dt = dayjs(iso);
      if (dt.isBefore(startDate, 'day') || dt.isAfter(endDate, 'day')) continue;
      const dateKey = dt.format('YYYY-MM-DD');
      const time = dt.format('HH:mm');
      if (!slotTimesByDate.has(dateKey)) {
        slotTimesByDate.set(dateKey, []);
      }
      slotTimesByDate.get(dateKey)!.push(time);
    }
    console.log(slotTimesByDate);

    // 2. Строим все слоты (день + время) на основе дней недели и времен из карты
    const allSlots: { dayDate: dayjs.Dayjs; time: string }[] = [];
    for (const day of daysInWeek) {
      const dateKey = day.format('YYYY-MM-DD');
      const times = slotTimesByDate.get(dateKey) || [];
      times.sort();
      for (const time of times) {
        allSlots.push({ dayDate: day, time });
      }
    }

    console.log(allSlots);
    // 3. Группировка заказов по слотам
    const slotMap = new Map<string, Map<number, number>>();
    for (const order of orders) {
      const orderDate = dayjs(order.scheduledAt).add(3, 'hour');
      console.log(orderDate);
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

    // 4. Формирование таблицы
    const typeCols = washTypes.map((wt) => wt.name);
    const header = ['День / Время', ...typeCols, 'Итого']; // изменено название последнего столбца

    const bodyRows: (string | number)[][] = [];
    let grandTotal = 0;
    const totalsByType = new Array(washTypes.length).fill(0); // для итоговой строки

    for (const slot of allSlots) {
      const slotId = `${slot.dayDate.format('YYYY-MM-DD')}_${slot.time}`;
      const typeMap = slotMap.get(slotId) || new Map();
      const row: (string | number)[] = [];
      let slotSum = 0;
      for (let i = 0; i < washTypes.length; i++) {
        const wt = washTypes[i];
        const count = typeMap.get(wt.id) || 0;
        row.push(count);
        slotSum += count;
        totalsByType[i] += count; // накапливаем итоги по типу
      }
      row.push(slotSum);

      const rowLabel = `${slot.dayDate.format('dddd DD.MM')} (${slot.time})`;
      bodyRows.push([rowLabel, ...row]);

      grandTotal += slotSum;
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

    // Добавляем итоговую строку (суммы по каждому типу и общая сумма)
    const totalRow = ['Итого стирок', ...totalsByType, grandTotal];
    bodyRows.push(totalRow);

    return { header, body: bodyRows };
  }

  // Подготовка данных для месячного отчёта (строки – типы стирок, столбцы – дни)
  function buildMonthData(
    orders: Order[],
    washTypes: WashType[],
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
  ) {
    const allDays = getDaysInRange(startDate, endDate);

    // Сначала посчитаем заказы по дням (как и раньше)
    const typeIndex = new Map<number, number>();
    washTypes.forEach((wt, idx) => typeIndex.set(wt.id, idx));

    // Временная матрица: строки = типы, столбцы = все дни диапазона
    const tempRows: (string | number)[][] = washTypes.map((wt) => {
      return [wt.name, ...new Array(allDays.length).fill(0), 0];
    });
    const dayTotals = new Array(allDays.length).fill(0);

    for (const order of orders) {
      const orderDay = dayjs(order.scheduledAt);
      const dayIdx = allDays.findIndex((d) => d.isSame(orderDay, 'day'));
      if (dayIdx === -1) continue;

      for (const wt of order.washTypes) {
        const rowIdx = typeIndex.get(wt.washTypeId);
        if (rowIdx !== undefined) {
          tempRows[rowIdx][dayIdx + 1] =
            (tempRows[rowIdx][dayIdx + 1] as number) + 1;
          dayTotals[dayIdx] += 1;
        }
      }
    }

    // Определяем, какие дни имеют ненулевой итог (была хотя бы одна стирка)
    const nonZeroDayIndices = dayTotals.reduce<number[]>((acc, total, idx) => {
      if (total > 0) acc.push(idx);
      return acc;
    }, []);

    // Если нет ни одного дня с заказами – возвращаем пустую таблицу
    if (nonZeroDayIndices.length === 0) {
      const header = ['Тип стирки', 'Нет заказов', 'Итого за тип'];
      const body = [['Нет заказов за период', '', '']];
      return { header, body };
    }

    // Строим финальные столбцы: только отфильтрованные дни
    const days = nonZeroDayIndices.map((idx) => allDays[idx]);
    const header = [
      'Тип стирки',
      ...days.map((d) => d.format('DD.MM')),
      'Итого за тип',
    ];

    // Создаём финальные строки: копируем значения только для отфильтрованных столбцов
    const rows: (string | number)[][] = washTypes.map((wt, rowIdx) => {
      const rowData = [wt.name];
      let typeSum = 0;
      for (const colIdx of nonZeroDayIndices) {
        const val = tempRows[rowIdx][colIdx + 1] as number;
        rowData.push(val);
        typeSum += val;
      }
      rowData.push(typeSum); // итог по типу
      return rowData;
    });

    // Итоговая строка по дням (только для отфильтрованных дней)
    const filteredDayTotals = nonZeroDayIndices.map((idx) => dayTotals[idx]);
    const totalDayRow = [
      'Итого за день',
      ...filteredDayTotals,
      filteredDayTotals.reduce((a, b) => a + b, 0),
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
  ) {
    if (!orders.length) {
      alert(
        'Нет заказов за выбранный период. Отчёт не может быть сгенерирован.',
      );
      return;
    }

    let mainTable: { header: string[]; body: (string | number)[][] };

    if (periodType === 'week') {
      const schedule = await $fetch('/api/reports', {
        method: 'GET',
        query: {
          first: start.toISOString(),
          last: end.toISOString(),
        },
      });
      if (!schedule)
        throw new Error('Для недельного отчёта необходимо расписание');
      mainTable = buildWeekData(orders, washTypes, schedule, start, end);
    } else if (periodType === 'month') {
      mainTable = buildMonthData(orders, washTypes, start, end);
    } else {
      mainTable = buildYearData(orders, washTypes, start.year());
    }

    const details = buildDetails(orders, washTypes);

    return mainTable;
  }

  return { generateReport };
}
