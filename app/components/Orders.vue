<template>
  <div class="washin-orders__wrapper">
    <!-- Десктопное отображение (таблица) -->
    <div v-if="isDesktop" class="washin-orders-desktop">
      <div
        v-for="[dateKey, ordersOfDate] in groupedByDate"
        :key="dateKey"
        class="date-group"
      >
        <h3>{{ formatDateTitle(dateKey) }}</h3>
        <div class="schedule-table-wrapper">
          <table class="schedule-table">
            <thead>
              <tr>
                <th class="time-column">Время</th>
                <th v-for="col in columns" :key="col.id" class="machine-column">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in getTableRows(ordersOfDate)" :key="row.time">
                <td class="time-cell">{{ row.time }}</td>
                <template v-for="(cell, idx) in row.cells" :key="idx">
                  <td :colspan="cell.colspan" class="order-cell">
                    <div
                      v-for="order in cell.orders"
                      :key="order.id"
                      class="order"
                      :class="{ unactive: isUnactive(order.scheduledAt) }"
                    >
                      <div class="order__number">
                        {{ formatWashinOrderNumber(order.orderNumber) }}
                      </div>
                      <div class="order__date">
                        <strong>Время:</strong>
                        {{ formatTime(order.scheduledAt) }}
                      </div>
                      <div class="order__date">
                        <strong>ФИО:</strong> {{ order.customerName }}
                      </div>
                      <div class="order__date">
                        <strong>Т.:</strong>
                        <a
                          :href="`tel:${formatPhoneForLink(order.customerPhone)}`"
                        >
                          {{ order.customerPhone }}
                        </a>
                      </div>
                      <div class="order__date" v-if="order.comment">
                        <strong>Комметарий:</strong> {{ order.comment }}
                      </div>
                      <UiButton
                        size="min"
                        color="var(--color-red)"
                        class="order-card__btn"
                        @click="openDeleteConfirm(order)"
                      >
                        Удалить
                      </UiButton>
                    </div>
                    <div v-if="!cell.orders.length" class="empty-cell"></div>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Мобильное отображение (карточки) – без изменений -->
    <div v-else class="washin-orders-mobile">
      <div
        v-for="[dateKey, ordersOfDate] in groupedByDate"
        :key="dateKey"
        class="date-group"
      >
        <h3>{{ formatDateTitle(dateKey) }}</h3>
        <div class="orders-list">
          <div
            v-for="order in sortOrdersByTime(ordersOfDate)"
            :key="order.id"
            class="order"
            :class="{ unactive: isUnactive(order.scheduledAt) }"
          >
            <!-- содержимое карточки без изменений -->
            <div class="order__number">
              {{ formatWashinOrderNumber(order.orderNumber) }}
            </div>
            <div class="order__date">
              <strong>Время:</strong> {{ formatTime(order.scheduledAt) }}
            </div>
            <div class="order__date">
              <strong>ФИО:</strong> {{ order.customerName }}
            </div>
            <div class="order__date">
              <strong>Т.: </strong>
              <a :href="`tel:${formatPhoneForLink(order.customerPhone)}`">
                {{ order.customerPhone }}
              </a>
            </div>
            <div class="order__date" v-if="order.comment">
              <strong>Комметарий:</strong> {{ order.comment }}
            </div>
            <div class="order__type">
              <strong>Стирки:</strong>
              <UiList>
                <li v-for="type in getType(order.washTypes)">{{ type }}</li>
              </UiList>
            </div>
            <UiButton
              size="min"
              color="var(--color-red)"
              class="order__btn"
              @click="openDeleteConfirm(order)"
            >
              Удалить
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <UiModalConfirm
      v-model="isConfirmModalVisible"
      title="Удаление заказа"
      :message="`Вы действительно хотите удалить заказ №${orderToDelete?.orderNumber ?? ''}?`"
      confirm-text="Удалить"
      cancel-text="Отмена"
      @confirm="deleteOrder"
    />
  </div>
</template>

<script setup lang="ts">
  import type { Order, WashType } from '~~/prisma/generated/client';
  import { formatDateOrder, formatTime } from '~~/shared/utils/day';
  import { formatWashinOrderNumber } from '~~/shared/utils/utils';

  interface Props {
    orders: Array<Order>;
  }

  const emit = defineEmits<{
    (e: 'orderDeleted', orderId: number): void;
  }>();

  const props = defineProps<Props>();

  // ===== Адаптивность =====
  const isDesktop = ref(false);
  let resizeCleanup: (() => void) | null = null;

  const checkScreenWidth = () => {
    isDesktop.value = window.innerWidth >= 768;
  };

  onMounted(() => {
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    resizeCleanup = () =>
      window.removeEventListener('resize', checkScreenWidth);
  });

  onBeforeUnmount(() => {
    if (resizeCleanup) resizeCleanup();
  });

  // ===== Данные =====
  const washTypes = ref<WashType[]>([]);
  const isConfirmModalVisible = ref(false);
  const orderToDelete = ref<Order | null>(null);

  // Группировка заказов по датам (YYYY-MM-DD)
  const groupedByDate = computed(() => {
    const groups = new Map<string, Order[]>();
    for (const order of props.orders) {
      const dateObj = new Date(order.scheduledAt);
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid scheduledAt:', order.scheduledAt, order);
        continue;
      }
      const dateKey = dateObj.toISOString().split('T')[0];
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(order);
    }
    return new Map(
      [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    );
  });

  // ===== Десктоп: колонки (стиральные машины) =====
  interface TableColumn {
    id: string;
    label: string;
    washTypeId: number;
    machineIndex: number;
  }

  const columns = computed<TableColumn[]>(() => {
    const cols: TableColumn[] = [];
    for (const wt of washTypes.value.sort((a, b) => a.id - b.id)) {
      const machineCount = Math.max(1, wt.machineCount);
      for (let i = 0; i < machineCount; i++) {
        cols.push({
          id: `${wt.id}_${i}`,
          label: machineCount > 1 ? `${wt.name} (машинка ${i + 1})` : wt.name,
          washTypeId: wt.id,
          machineIndex: i,
        });
      }
    }
    return cols;
  });

  // Получить отсортированные времена для конкретной даты (по timestamp)
  function getSortedTimes(ordersOfDate: Order[]): Date[] {
    const timesSet = new Set<number>();
    for (const order of ordersOfDate) {
      timesSet.add(new Date(order.scheduledAt).getTime());
    }
    return Array.from(timesSet)
      .map((ts) => new Date(ts))
      .sort((a, b) => a.valueOf() - b.valueOf());
  }

  // Определить, в каких колонках должен отображаться заказ (индексы в columns)
  function getOrderColumnIndices(order: Order): number[] {
    const indices: number[] = [];
    for (let idx = 0; idx < columns.value.length; idx++) {
      const col = columns.value[idx];
      const hasType = order.washTypes.some(
        (wt) => wt.washTypeId === col.washTypeId,
      );
      if (!hasType) continue;
      const machineCount =
        washTypes.value.find((wt) => wt.id === col.washTypeId)?.machineCount ??
        1;
      // Для типов с несколькими машинами заказ показываем только в первой колонке
      if (machineCount > 1 && col.machineIndex !== 0) continue;
      indices.push(idx);
    }
    return indices;
  }

  // Генерация строк таблицы с объединением ячеек
  function getTableRows(ordersOfDate: Order[]) {
    if (columns.value.length === 0) return [];

    const times = getSortedTimes(ordersOfDate);
    const rows = [];

    for (const time of times) {
      const timeOrders = ordersOfDate.filter(
        (order) => new Date(order.scheduledAt).getTime() === time.getTime(),
      );

      const colCount = columns.value.length;
      // Занятость колонок: null – свободно, иначе объект заказа
      const occupied: (Order | null)[] = Array(colCount).fill(null);
      // Для каждого заказа решаем, будет он объединён или нет
      const mergeInfo: { order: Order; start: number; end: number }[] = [];

      // Сначала пробуем объединить заказы, которые занимают несколько колонок
      const multiColumnOrders = timeOrders.filter((order) => {
        const indices = getOrderColumnIndices(order);
        return (
          indices.length > 1 &&
          indices.every((v, i, arr) => i === 0 || v === arr[i - 1] + 1)
        );
      });

      for (const order of multiColumnOrders) {
        const indices = getOrderColumnIndices(order);
        const allFree = indices.every((idx) => occupied[idx] === null);
        if (allFree) {
          const start = indices[0];
          const end = indices[indices.length - 1];
          mergeInfo.push({ order, start, end });
          for (let i = start; i <= end; i++) {
            occupied[i] = order;
          }
        }
      }

      // Оставшиеся заказы (или те, что не удалось объединить) размещаем в отдельных ячейках
      const remainingOrders = timeOrders.filter((order) => {
        const indices = getOrderColumnIndices(order);
        // Если заказ уже занял место через объединение – пропускаем
        if (mergeInfo.some((m) => m.order.id === order.id)) return false;
        // Если хотя бы одна из его колонок уже занята – тоже размещаем отдельно
        return true;
      });

      for (const order of remainingOrders) {
        const indices = getOrderColumnIndices(order);
        for (const idx of indices) {
          if (occupied[idx] === null) {
            occupied[idx] = order;
          }
        }
      }

      // Формируем ячейки строки, объединяя соседние одинаковые заказы
      const cells: { colspan: number; orders: Order[] }[] = [];
      let i = 0;
      while (i < colCount) {
        const currentOrder = occupied[i];
        if (currentOrder === null) {
          // Пустая ячейка
          cells.push({ colspan: 1, orders: [] });
          i++;
          continue;
        }
        // Определяем длину непрерывного блока с этим же заказом
        let span = 1;
        while (i + span < colCount && occupied[i + span] === currentOrder) {
          span++;
        }
        cells.push({ colspan: span, orders: [currentOrder] });
        i += span;
      }

      // Форматируем время для отображения
      const timeStr = formatTime(time);
      rows.push({ time: timeStr, cells });
    }
    return rows;
  }

  // Сортировка заказов для мобильной версии
  function sortOrdersByTime(ordersOfDate: Order[]): Order[] {
    return [...ordersOfDate].sort(
      (a, b) =>
        new Date(a.scheduledAt).valueOf() - new Date(b.scheduledAt).valueOf(),
    );
  }

  function formatDateTitle(dateKey: string): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return formatDateOrder(date);
  }

  // ===== Общие утилиты =====
  function isUnactive(date: Date | string) {
    return new Date(date).valueOf() <= new Date().valueOf();
  }

  function formatPhoneForLink(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  function openDeleteConfirm(order: Order) {
    orderToDelete.value = order;
    isConfirmModalVisible.value = true;
  }

  function getType(colors: { washTypeId: number }[]) {
    const names: string[] = [];
    colors.forEach((color) => {
      const type = washTypes.value.find((type) => type.id === color.washTypeId);
      if (type) names.push(type.name);
    });
    return names;
  }

  async function deleteOrder() {
    if (!orderToDelete.value) return;
    try {
      await $fetch(`/api/orders/${orderToDelete.value.id}`, {
        method: 'DELETE',
      });
      emit('orderDeleted', orderToDelete.value.id);
    } catch (err) {
      console.error('Ошибка при удалении заказа:', err);
    } finally {
      isConfirmModalVisible.value = false;
      orderToDelete.value = null;
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

  onMounted(() => {
    loadWashTypes();
  });
</script>

<style scoped lang="scss">
  /* Стили остаются прежними, добавляем класс для пустой ячейки */
  // .empty-cell {
  //   min-height: 40px; /* опционально для сохранения высоты строки */
  // }
  /* Остальные стили без изменений */
  .date-group {
    margin-bottom: 1em;
  }
  .order {
    width: 300px;
    padding: 10px;
    border: 4px solid var(--color-black);
    border-radius: var(--border-radius);
    display: flex;
    flex-direction: column;
    &.unactive {
      opacity: 0.2;
      & > * {
        color: var(--color-black);
      }
    }
    &__number {
      text-align: center;
      font-size: 60px;
      font-weight: 600;
      color: v-bind(getRandomColor());
    }
    &__date {
      margin-top: 6px;
      strong {
        font-weight: 600;
      }
      a {
        color: var(--color-black);
      }
    }
    &__btn {
      align-self: end;
      margin-top: 10px;
    }
  }

  /* Десктопная таблица */
  .washin-orders-desktop {
    padding: 20px;
  }
  .schedule-table-wrapper {
    overflow-x: auto;
  }
  .schedule-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8em;
    th,
    td {
      border: 0.2px dashed grey;
      padding: 2px;
      vertical-align: top;
    }
    th {
      background-color: var(--color-green);
      padding: 1em;
      font-weight: 600;
      text-align: center;
    }
    .time-column {
      width: 30px;
      text-align: center;
    }
    .time-cell {
      background-color: var(--color-orange);
      text-align: center;
      font-size: 1.2em;
      font-weight: 600;
      vertical-align: middle;
    }
    .order-cell {
      // min-width: 100px;
    }
    .order {
      width: auto;
      border-width: 2px;
      // font-size: 0.8em;
      &__number {
        font-size: 2em;
      }
    }
  }

  /* Мобильные карточки */
  .washin-orders-mobile {
    .orders-list {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      padding: 10px 0;
    }
  }

  @media (max-width: 767px) {
    .washin-orders-desktop {
      display: none;
    }
  }
  @media (min-width: 768px) {
    .washin-orders-mobile {
      display: none;
    }
  }
</style>
