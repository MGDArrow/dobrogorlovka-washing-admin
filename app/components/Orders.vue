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
          <strong>Т.:</strong> {{ order.customerPhone }}
        </div>
        <div class="order__type">
          <strong>Стирки:</strong>
          <UiList>
            <li v-for="type in getType(order.washTypes)">
              {{ type }}
            </li>
            <!-- <li>{{ order.washTypes }}</li> -->
          </UiList>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { Order, WashType } from '~~/prisma/generated/client';
  import { formatDateOrder, formatTime } from '~~/shared/utils/day';
  import { formatWashinOrderNumber } from '~~/shared/utils/utils';

  interface Props {
    orders: Array<Order>;
  }

  const props = defineProps<Props>();

  const sortedOrders = computed(() => {
    const sorted = props.orders.sort(
      (a, b) =>
        new Date(a.scheduledAt).valueOf() - new Date(b.scheduledAt).valueOf(),
    );
    return sorted;
  });
  const washTypes = ref<WashType[]>([]);

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

  onMounted(() => {
    loadWashTypes();
  });
</script>

<style scoped lang="scss">
  .washin-orders {
    // width: max-content;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 10px;
    padding: 40px 0;
    // &__wrapper {
    //   min-width: 300px;
    //   overflow-x: auto;
    //   overflow-y: hidden;
    //   padding: 0 20px;
    //   margin: 0 auto;
    //   max-width: max-content;
    // }
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
      & strong {
        font-weight: 600;
      }
      & p {
        text-align: center;
      }
    }
  }
</style>
