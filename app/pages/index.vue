<template>
  <section class="pages">
    <h2>Поиск заказа</h2>
    <OrderSearch />
    <h2>Список заказов</h2>
    <ClientOnly>
      <WashingCalendar v-model="dateForCalendar" />
      <template v-if="loading"
        ><div class="date__waiting">
          <UiSpinner /></div
      ></template>
      <template v-else-if="orders.length === 0">
        <div class="date__waiting">Нет заказов на эту неделю</div>
      </template>
      <template v-else>
        <Orders :orders />
      </template>
    </ClientOnly>
  </section>
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
  });

  import type { Dayjs } from 'dayjs';

  const dateForCalendar: Ref<Dayjs> = ref(initDaysj(new Date()));
  const weekForCalendar: ComputedRef<[Dayjs, Dayjs]> = computed(() =>
    getMondayAndSunday(dateForCalendar.value),
  );
  const loading = ref(false);
  const orders = ref([]);

  watch(weekForCalendar, async (newVal, oldVal) => {
    if (newVal.toString() !== oldVal.toString()) {
      await getDatesTimesForWashing();
    }
  });

  const abortController = ref<AbortController | null>(null);
  async function getDatesTimesForWashing() {
    // Отменяем предыдущий запрос
    if (abortController.value) {
      abortController.value.abort();
    }

    abortController.value = new AbortController();
    const signal = abortController.value.signal;

    loading.value = true;
    try {
      const data = await $fetch('/api/orders', {
        method: 'GET',
        query: {
          ...getDateForQuerryGet(weekForCalendar.value),
        },
        signal,
      });
      orders.value = data;
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Ошибка загрузки расписания', err);
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    await getDatesTimesForWashing();
  });
</script>

<style scoped lang="scss">
  .pages {
    // width: 100%;
  }
</style>
