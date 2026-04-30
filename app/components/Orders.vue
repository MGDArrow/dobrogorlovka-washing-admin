<template>
  <div class="washin-orders__wrapper">
    <!-- Десктопное отображение (таблица) -->
    <div v-if="isDesktop" class="washin-orders-desktop">
      <div
        v-for="[dateKey, ordersOfDate] in groupedByDate"
        :key="dateKey"
        class="date-group"
      >
        <h3>
          {{ formatDateTitle(dateKey) }}
        </h3>

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
              <tr v-for="time in getSortedTimes(ordersOfDate)" :key="time">
                <td class="time-cell">{{ time }}</td>
                <td v-for="col in columns" :key="col.id" class="order-cell">
                  <div
                    v-for="order in getOrdersForCell(ordersOfDate, time, col)"
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Мобильное отображение (карточки с группировкой по датам) -->
    <div v-else class="washin-orders-mobile">
      <div
        v-for="[dateKey, ordersOfDate] in groupedByDate"
        :key="dateKey"
        class="date-group"
      >
        <h3>
          {{ formatDateTitle(dateKey) }}
        </h3>
        <div class="orders-list">
          <div
            v-for="order in sortOrdersByTime(ordersOfDate)"
            :key="order.id"
            class="order"
            :class="{ unactive: isUnactive(order.scheduledAt) }"
          >
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
                <li v-for="type in getType(order.washTypes)">
                  {{ type }}
                </li>
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

  // ===== Адаптивность (desktop >= 768px) =====
  const isDesktop = ref(false);
  let resizeObserver: (() => void) | null = null;

  const checkScreenWidth = () => {
    isDesktop.value = window.innerWidth >= 768;
  };

  onMounted(() => {
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    resizeObserver = () =>
      window.removeEventListener('resize', checkScreenWidth);
  });

  onBeforeUnmount(() => {
    if (resizeObserver) resizeObserver();
  });

  // ===== Данные =====
  const washTypes = ref<WashType[]>([]);
  const isConfirmModalVisible = ref(false);
  const orderToDelete = ref<Order | null>(null);

  // Группировка заказов по дате (YYYY-MM-DD) с безопасным преобразованием scheduledAt в Date
  const groupedByDate = computed(() => {
    const groups = new Map<string, Order[]>();
    for (const order of props.orders) {
      const dateObj = new Date(order.scheduledAt);
      // Проверка валидности даты
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid scheduledAt:', order.scheduledAt, order);
        continue;
      }
      const dateKey = dateObj.toISOString().split('T')[0];
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(order);
    }
    // Сортировка дат по возрастанию
    return new Map(
      [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    );
  });

  // ===== Десктоп: построение колонок (машинок) =====
  interface TableColumn {
    id: string; // `${washTypeId}_${machineIndex}`
    label: string; // "Название типа (машина 1)" или просто название
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

  // Получить отсортированные времена для конкретной даты (на основе заказов этой даты)
  function getSortedTimes(ordersOfDate: Order[]): string[] {
    const timesSet = new Set<string>();
    for (const order of ordersOfDate) {
      timesSet.add(formatTime(order.scheduledAt));
    }
    return Array.from(timesSet).sort((a, b) => a.localeCompare(b));
  }

  // Получить заказы для конкретной ячейки (время, колонка)
  function getOrdersForCell(
    ordersOfDate: Order[],
    time: string,
    column: TableColumn,
  ): Order[] {
    const machineCountMap = new Map<number, number>();
    for (const wt of washTypes.value) {
      machineCountMap.set(wt.id, Math.max(1, wt.machineCount));
    }

    return ordersOfDate.filter((order) => {
      // Совпадение по времени
      if (formatTime(order.scheduledAt) !== time) return false;

      // Есть ли у заказа данный тип стирки?
      const hasWashType = order.washTypes.some(
        (wt) => wt.washTypeId === column.washTypeId,
      );
      if (!hasWashType) return false;

      // Для типов с несколькими машинами заказ показываем только в первой колонке (machineIndex === 0)
      const machineCount = machineCountMap.get(column.washTypeId) || 1;
      if (machineCount > 1 && column.machineIndex !== 0) return false;

      return true;
    });
  }

  // Сортировка заказов по времени для мобильной версии
  function sortOrdersByTime(ordersOfDate: Order[]): Order[] {
    return [...ordersOfDate].sort(
      (a, b) =>
        new Date(a.scheduledAt).valueOf() - new Date(b.scheduledAt).valueOf(),
    );
  }

  // Форматирование заголовка даты (например, "12 апреля, среда")
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
  /* Общие стили для обеих версий */
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

  /* ------ Десктопная таблица ------ */
  .washin-orders-desktop {
    padding: 20px;
  }
  .schedule-table-wrapper {
    overflow-x: auto;
  }
  .schedule-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    th,
    td {
      border: 0.2px dashed lightgray;
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
      min-width: 180px;
    }
    .order {
      width: auto;
      border-width: 2px;
      font-size: 0.8em;
      &__number {
        font-size: 40px;
      }
    }
  }

  /* ------ Мобильные карточки (группировка по датам) ------ */

  .washin-orders-mobile {
    .orders-list {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      padding: 10px 0;
    }
  }
  /* Адаптив: на мобильных скрываем десктопную версию, на десктопе — мобильную */
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
