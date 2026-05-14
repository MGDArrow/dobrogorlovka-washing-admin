<template>
  <div class="report-wrapper">
    <div class="report-page">
      <h1>Отчёт "Стирки добра"</h1>
      <h2>
        {{ startDate.format('DD MMMM YYYY') }} —
        {{ endDate.format('DD MMMM YYYY') }}
      </h2>

      <div class="row">
        <div class="stats-content">
          <div class="stats-cards">
            <div class="card">
              <div class="card-value">{{ stats.totalOrders }}</div>
              <div class="card-label">Заказов</div>
            </div>
            <div class="card">
              <div class="card-value">{{ stats.totalWashes }}</div>
              <div class="card-label">Стирок</div>
            </div>
            <div class="card">
              <div class="card-value">{{ stats.averageWashes }}</div>
              <div class="card-label">Стирок / заказ</div>
            </div>
          </div>
        </div>

        <div class="chart-pie">
          <PieChart :data="typeChartData" :options="chartOptionsPie" />
        </div>
      </div>
      <div class="chart-line">
        <LineChart :data="dailyChartData" :options="chartOptionsLine" />
      </div>
      <div class="page-number">1/{{ ordersTable.length + 2 }}</div>
    </div>
    <div class="report-page" v-if="table">
      <table>
        <tr>
          <th v-for="t in table.header">
            {{ t }}
          </th>
        </tr>
        <tr v-for="row in table.body">
          <td v-for="cell in row">{{ cell }}</td>
        </tr>
      </table>
      <div class="page-number">2/{{ ordersTable.length + 2 }}</div>
    </div>

    <div class="report-page" v-for="(list, i) in ordersTable" :key="i">
      <div class="orders-list">
        <div class="orders-column" v-for="(column, j) in list" :key="j">
          <div class="orders-line" v-for="(order, k) in column" :key="order.id">
            <div class="number">{{ i * 30 + j * 15 + k + 1 }}</div>
            <div class="info">
              <div class="date">
                {{ formatDateOrder(order.scheduledAt) }}
              </div>
              <div class="id">
                {{ formatTime(order.scheduledAt) }} №{{
                  formatWashinOrderNumber(order.orderNumber)
                }}
              </div>
            </div>
            <div class="customer">
              <div class="name">{{ order.customerName }}</div>
              <div class="phone">{{ order.customerPhone }}</div>
            </div>
            <div class="washes" v-if="order?.washTypes.length">
              <span v-for="(wash, id) in order.washTypes" :key="wash">
                <span v-if="id !== 0">, </span>
                {{
                  washTypes.find((t) => t.id === wash.washTypeId)?.name
                }}</span
              >
            </div>
          </div>
        </div>
      </div>
      <div class="page-number">{{ i + 3 }}/{{ ordersTable.length + 2 }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { Order, WashType } from '~~/prisma/generated/client';
  import dayjs from 'dayjs';
  import { Line as LineChart, Pie as PieChart } from 'vue-chartjs';
  import {
    Chart as ChartJS,
    Legend,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    ArcElement,
  } from 'chart.js';
  import { useReportExport } from '~/components/composables/useReportExport';

  definePageMeta({
    layout: 'print',
  });

  ChartJS.register(
    Legend,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    ArcElement,
  );

  // Получаем параметры из query
  const route = useRoute();
  const periodType = route.query.periodType as 'week' | 'month' | 'year';
  const startStr = route.query.start as string;
  const endStr = route.query.end as string;

  const startDate = dayjs(startStr).add(3, 'hour');
  const endDate = dayjs(endStr).add(3, 'hour');

  const orders = ref<Order[]>([]);
  const washTypes = ref<WashType[]>([]);

  const ordersTable = computed(() => {
    const result = [];
    const GROUP_SIZE = 30;
    const arr = orders.value.sort(
      (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt),
    );

    for (let i = 0; i < arr.length; i += GROUP_SIZE) {
      // Берём очередную группу из 30 элементов (последняя может быть меньше)
      const group = arr.slice(i, i + GROUP_SIZE);
      // Вычисляем середину: округление вверх для первой половины
      const mid = Math.ceil(GROUP_SIZE / 2);
      // Делим группу пополам
      const firstHalf = group.slice(0, mid);
      const secondHalf = group.slice(mid);
      // Добавляем пару половинок в результат
      result.push([firstHalf, secondHalf]);
    }

    return result;
  });

  // ---- Агрегированная статистика (вычисляется реактивно) ----
  const stats = computed(() => {
    const ords = orders.value;
    if (!ords.length) {
      return {
        totalOrders: 0,
        totalWashes: 0,
        averageWashes: 0,
        typeStats: [] as {
          id: number;
          name: string;
          count: number;
          percent: number;
        }[],
        dailyStats: [] as { date: string; orders: number; washes: number }[],
      };
    }

    // 1. Общее кол-во стирок
    let totalWashes = 0;
    const washCountById: Record<number, number> = {};
    for (const order of ords) {
      const washIds = order.washTypes.map((wt) => wt.washTypeId);
      totalWashes += washIds.length;
      for (const id of washIds) {
        washCountById[id] = (washCountById[id] || 0) + 1;
      }
    }

    // 2. Статистика по типам (с подстановкой имени)
    const typeStats = Object.entries(washCountById)
      .map(([idStr, count]) => {
        const id = Number(idStr);
        const type = washTypes.value.find((t) => t.id === id);
        return {
          id,
          name: type?.name || `Тип ${id}`,
          count,
          percent: totalWashes ? Math.round((count / totalWashes) * 100) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    // 3. Группировка по дням (только дни с заказами)
    const dayMap = new Map<string, { orders: number; washes: number }>();
    for (const order of ords) {
      const dayKey = initDaysj(order.scheduledAt).format('YYYY-MM-DD');
      const existing = dayMap.get(dayKey) || { orders: 0, washes: 0 };
      existing.orders += 1;
      existing.washes += order.washTypes.length;
      dayMap.set(dayKey, existing);
    }
    const dailyStats = Array.from(dayMap.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        washes: data.washes,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalOrders: ords.length,
      totalWashes,
      averageWashes: +(totalWashes / ords.length).toFixed(2),
      typeStats,
      dailyStats,
    };
  });

  // Данные для линейного графика
  const dailyChartData = computed(() => ({
    labels: stats.value.dailyStats.map((d) =>
      initDaysj(d.date).format('DD.MM'),
    ),
    datasets: [
      {
        label: 'Заказы',
        data: stats.value.dailyStats.map((d) => d.orders),
        borderColor: '#42a5f5',
        backgroundColor: 'transparent',
        tension: 0.2,
      },
      {
        label: 'Стирки',
        data: stats.value.dailyStats.map((d) => d.washes),
        borderColor: '#ffa726',
        backgroundColor: 'transparent',
        tension: 0.2,
      },
    ],
  }));

  // Данные для круговой диаграммы
  const typeChartData = computed(() => ({
    labels: stats.value.typeStats.map(
      (t) => `${t.name}: ${t.count} (${t.percent}%)`,
    ),
    datasets: [
      {
        data: stats.value.typeStats.map((t) => t.count),
        backgroundColor: [
          '#a6c729',
          '#3b81c3',
          '#f18918',
          '#fc00af',
          '#fc0000',
        ],
      },
    ],
  }));

  const chartOptionsPie = {
    aspectRatio: 3,
    plugins: {
      legend: { position: 'right' as const },
    },
    borderColor: '#111111',
    borderWidth: 1,
    radius: '80%',
    animations: false,
  };

  const chartOptionsLine = {
    aspectRatio: 4,
    plugins: {
      legend: { position: 'bottom' as const },
    },
    borderColor: '#111111',
    borderWidth: 3,
    animations: false,
  };

  // ---- Период ----

  async function fetchOrders() {
    try {
      const data = await $fetch<Order[]>('/api/orders', {
        params: {
          first: startDate.toISOString(),
          last: endDate.toISOString(),
        },
      });
      orders.value = data;
    } catch (err) {
      console.error(err);
      orders.value = [];
    }
  }

  async function loadWashTypes() {
    try {
      const data = await $fetch<WashType[]>('/api/wash-types');
      washTypes.value = data;
    } catch (err) {
      console.error('Ошибка загрузки типов стирок', err);
    }
  }

  const { generateReport } = useReportExport();
  const table = ref<any>(null);

  async function exportToPdf() {
    if (orders.value.length === 0) {
      alert('Нет заказов за выбранный период. Невозможно сгенерировать отчёт.');
      return;
    }

    table.value = await generateReport(
      periodType,
      startDate,
      endDate,
      orders.value,
      washTypes.value,
    );
  }

  onMounted(async () => {
    await loadWashTypes();
    await fetchOrders();
    await exportToPdf();

    await nextTick();
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        (window as any).reportReady = true;
      }
    }, 300);
  });
</script>

<style scoped lang="scss">
  .report-page {
    height: 21cm;
    overflow: auto;
    padding: 2cm 0;
    font-size: 14pt;
    position: relative;
  }
  .page-number {
    position: absolute;
    left: 50%;
    bottom: 1cm;
    font-size: 0.7em;
    transform: translate(-50%, -50%);
  }

  h1 {
    font-size: 20pt;
    margin: 0.1cm;
  }
  h2 {
    font-size: 16pt;
    margin: 0.1cm;
    font-weight: 400;
  }

  .stats-cards {
    display: flex;
    flex: 0.3;
    flex-wrap: wrap;
    gap: var(--border-radius);
    flex-direction: column;
    padding: var(--border-radius);
    .card {
      border-radius: var(--border-radius);
      padding: 0.3cm 0;
      text-align: center;
      border: 2px solid v-bind(getRandomColor());
      .card-value {
        font-size: 22pt;
        font-weight: bold;
      }
      .card-label {
        font-size: 12pt;
        padding: 0 2pt;
        color: grey;
        margin-top: 0.05cm;
      }
    }
  }

  .row {
    display: flex;
    gap: var(--border-radius);
  }

  .chart-pie {
    height: 7cm;
    flex: 1;
  }
  .chart-line {
    width: 25cm;
    height: 7cm;
    margin: 0 auto;
  }

  .orders-list {
    display: flex;
    gap: 0.3cm;
    width: 100%;
    font-size: 0.8em;
  }

  .orders-column {
    flex: 1;
  }

  .orders-line {
    display: flex;
    gap: 0.3cm;
    height: calc(17cm / 15);
    padding: 0.05cm;
    border-bottom: 1px solid grey;
    & .number,
    & .info {
      width: max-content;
    }
    & .date {
      font-weight: 500;
      font-size: 1.1em;
    }
    & .customer {
      flex: 1;
    }
    & .id,
    & .phone {
      font-size: 0.8em;
      font-style: italic;
    }
    & .washes {
      font-size: 0.7em;
      width: 4.5cm;
    }
  }

  table {
    width: 25.7cm;
    border-collapse: collapse;
    border: 2px solid black;
    text-align: center;
    & th,
    & td {
      vertical-align: middle;
      padding: 0.1cm;
      border: 1px solid black;
    }
    & tr:last-child,
    & td:last-child {
      background: lightcyan;
    }
    & td:first-child {
      font-weight: 600;
      background: lightskyblue;
      text-align: right;
    }
    & tr:first-child {
      font-weight: 600;
      & th {
        writing-mode: sideways-lr;
        padding: 0.5cm 0.1cm;
        background: lightseagreen;
      }
      & th:last-child,
      & th:first-child {
        padding: 0.1cm;
        writing-mode: unset;
      }
    }
  }
</style>
