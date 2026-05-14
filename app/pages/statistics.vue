<template>
  <section class="statistics">
    <h2>Статистика</h2>
    <div class="stats-page">
      <!-- Период -->
      <div class="period-type">
        <button
          v-for="type in periodTypes"
          :key="type.value"
          :class="{ active: periodType === type.value }"
          @click="periodType = type.value"
        >
          {{ type.label }}
        </button>
      </div>

      <!-- Динамическое управление периодом -->
      <div class="period-control">
        <WashingCalendar
          v-if="periodType === 'week'"
          v-model="dateForCalendar"
        />
        <div v-else-if="periodType === 'month'" class="month-picker">
          <input type="month" v-model="monthValue" />
        </div>
        <div v-else class="year-picker">
          <input type="number" v-model="yearValue" step="1" />
        </div>
      </div>

      <div class="export-button">
        <UiButton @click="goToReportPage" :color="'var(--color-orange)'">
          Экспорт PDF
        </UiButton>
      </div>

      <div v-if="loading" class="loading">
        <UiSpinner />
      </div>

      <div v-else-if="stats.totalOrders === 0" class="empty">
        Нет заказов за выбранный период
      </div>

      <div v-else class="stats-content">
        <!-- Карточки -->
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

        <!-- Динамика -->
        <div class="chart-container">
          <h3>Динамика заказов и стирок по дням</h3>
          <LineChart :data="dailyChartData" :options="chartOptions" />
        </div>

        <!-- Распределение по типам -->
        <div class="chart-container">
          <h3>Распределение по типам стирок</h3>
          <PieChart :data="typeChartData" :options="chartOptions" />
        </div>

        <!-- Таблица -->
        <div class="type-table">
          <h3>Детализация по типам стирок</h3>
          <table>
            <tr v-for="type in stats.typeStats" :key="type.id">
              <td>{{ type.name }}</td>
              <td>{{ type.count }}</td>
              <td>{{ type.percent }}%</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { Line as LineChart, Pie as PieChart } from 'vue-chartjs';
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    ArcElement,
  } from 'chart.js';
  import type { Order, WashType } from '~~/prisma/generated/client';
  import type { Dayjs } from 'dayjs';
  import dayjs from 'dayjs';
  definePageMeta({
    middleware: 'auth',
  });

  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    ArcElement,
  );

  type PeriodType = 'week' | 'month' | 'year';
  const periodType = ref<PeriodType>('week');
  const periodTypes = [
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'year', label: 'Год' },
  ];

  const dateForCalendar = ref<Dayjs>(initDaysj(new Date()));
  const monthValue = ref<string>(initDaysj(new Date()).format('YYYY-MM'));
  const yearValue = ref<number>(initDaysj(new Date()).year());

  // ---- Границы периода ----
  const periodRange = computed(() => {
    if (periodType.value === 'week') {
      const [monday, sunday] = getMondayAndSunday(dateForCalendar.value);
      return { start: monday, end: sunday };
    } else if (periodType.value === 'month') {
      const month = dayjs(monthValue.value);
      const start = month.startOf('month');
      const end = month.endOf('month');
      return { start, end };
    } else {
      const year = dayjs().year(yearValue.value);
      const start = year.startOf('year');
      const end = year.endOf('year');
      return { start, end };
    }
  });

  // ---- Состояние ----
  const currentWeekStart = computed(() => {
    const [monday] = getMondayAndSunday(dateForCalendar.value);
    return monday;
  });
  const loading = ref(false);
  const orders = ref<Order[]>([]);
  const washTypes = ref<WashType[]>([]);

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
    labels: stats.value.typeStats.map((t) => t.name),
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

  // Опции графиков (адаптивные, без лишних анимаций)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'bottom' as const },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  // ---- Период ----

  async function fetchOrders() {
    const { start, end } = periodRange.value;
    loading.value = true;
    try {
      const data = await $fetch<Order[]>('/api/orders', {
        params: {
          first: start.toISOString(),
          last: end.toISOString(),
        },
      });
      orders.value = data;
    } catch (err) {
      console.error(err);
      orders.value = [];
    } finally {
      loading.value = false;
    }
  }

  watch([periodType, () => periodRange.value.start], () => {
    fetchOrders();
  });

  watch(currentWeekStart, () => {
    fetchOrders();
  });

  // Загрузка типов стирок (один раз)
  async function loadWashTypes() {
    try {
      const data = await $fetch<WashType[]>('/api/wash-types');
      washTypes.value = data;
    } catch (err) {
      console.error('Ошибка загрузки типов стирок', err);
    }
  }

  function goToReportPage() {
    const { start, end } = periodRange.value;
    navigateTo({
      path: '/reports',
      query: {
        periodType: periodType.value,
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  }

  onMounted(() => {
    loadWashTypes();
    fetchOrders();
  });
</script>

<style scoped lang="scss">
  .statistics {
    @media (width <= 768px) {
      width: 95vw;
      margin: 0 auto;
    }
  }

  .period-type {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 20px;
    button {
      padding: 8px 20px;
      border: none;
      background: #f0f0f0;
      border-radius: 30px;
      cursor: pointer;
      transition: 0.2s;
      font-weight: 500;
      &.active {
        background: var(--color-primary, #2c3e50);
        color: white;
      }
    }
  }
  .period-control {
    margin: 20px 0;
    .month-picker,
    .year-picker {
      text-align: center;
      input {
        padding: 8px 16px;
        font-size: 1.1rem;
        border-radius: 30px;
        border: 1px solid #ccc;
        text-align: center;
      }
    }
    .year-picker input {
      width: 120px;
    }
  }

  .stats-page {
    padding: 16px;
    max-width: 1000px;
    margin: 0 auto;
  }

  .period-selector {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin: 20px 0;
    .period-btn {
      background: var(--color-primary, #2c3e50);
      color: white;
      border: none;
      border-radius: 30px;
      width: 40px;
      height: 40px;
      font-size: 20px;
      cursor: pointer;
    }
    .period-label {
      font-size: 1.2rem;
      font-weight: 500;
      background: #f0f0f0;
      padding: 8px 16px;
      border-radius: 30px;
    }
  }

  .loading,
  .empty {
    text-align: center;
    padding: 40px;
    font-size: 1.2rem;
    color: #7f8c8d;
  }

  .stats-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 30px;
    .card {
      flex: 1 1 150px;
      background: white;
      border-radius: 16px;
      padding: 20px 0;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      .card-value {
        font-size: 2.2rem;
        font-weight: bold;
        color: #2c3e50;
      }
      .card-label {
        font-size: 0.9rem;
        color: #7f8c8d;
        margin-top: 8px;
      }
    }
  }

  .chart-container {
    background: white;
    border-radius: 16px;
    padding: 16px;
    margin: 24px 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    h3 {
      margin-bottom: 16px;
      font-size: 1.2rem;
    }
  }

  .type-table {
    background: white;
    border-radius: 16px;
    padding: 16px;
    margin: 24px 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    h3 {
      margin-bottom: 16px;
      font-size: 1.2rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      tr {
        border-bottom: 1px solid #eee;
      }
      td {
        padding: 12px 8px;
        &:first-child {
          font-weight: 500;
        }
        &:last-child {
          text-align: right;
          color: #2c3e50;
        }
      }
    }
  }

  @media (max-width: 640px) {
    .stats-cards .card {
      flex-basis: calc(50% - 16px);
      .card-value {
        font-size: 1.8rem;
      }
    }
    .chart-container {
      padding: 12px;
    }
    .period-label {
      font-size: 1rem;
    }
  }

  .export-button {
    display: flex;
    justify-content: flex-end;
    margin: var(--space-4) 0;
  }
</style>
