<template>
  <div class="washin-orders__wrapper">
    <div class="washin-orders">
      <div
        v-for="order in sortedOrders"
        :key="order.id"
        class="order"
        :class="{ unactive: isUnactive(order.scheduledAt) }"
      >
        <div class="order__number">
          {{ formatWashinOrderNumber(order.orderNumber) }}
        </div>
        <div class="order__date">
          <strong>Дата:</strong> {{ formatDateOrder(order.scheduledAt) }}
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

  const sortedOrders = computed(() => {
    const sorted = props.orders.sort(
      (a, b) =>
        new Date(a.scheduledAt).valueOf() - new Date(b.scheduledAt).valueOf(),
    );
    return sorted;
  });
  const washTypes = ref<WashType[]>([]);

  const isConfirmModalVisible = ref(false);
  const orderToDelete = ref<Order | null>(null);

  function openDeleteConfirm(order: Order) {
    orderToDelete.value = order;
    isConfirmModalVisible.value = true;
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

  function getType(colors: { washTypeId: number }[]) {
    const names: string[] = [];
    colors.forEach((color) => {
      const type = washTypes.value.find((type) => type.id === color.washTypeId);
      if (type) names.push(type.name);
    });
    return names;
  }

  function isUnactive(date: Date) {
    return new Date(date).valueOf() <= new Date().valueOf();
  }

  async function loadWashTypes() {
    try {
      const data = await $fetch<WashType[]>('/api/wash-types');
      washTypes.value = data;
    } catch (err) {
      console.error('Ошибка загрузки типов стирок', err);
    }
  }

  function formatPhoneForLink(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, '');
    return cleaned;
  }

  onMounted(() => {
    loadWashTypes();
  });
</script>

<style scoped lang="scss">
  .washin-orders {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 10px;
    padding: 40px 0;
    & .order {
      width: 300px;
      padding: 10px;
      border: 4px solid var(--color-black);
      border-radius: var(--border-radius);
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
      &__btn {
        align-self: end;
      }
      & strong {
        font-weight: 600;
      }
      & p {
        text-align: center;
      }
      & a {
        color: var(--color-black);
      }
    }
  }
</style>
