<template>
  <div class="order-search">
    <div class="search-bar">
      <UiInput
        v-model="displayNumber"
        placeholder="Номер заказа: XXX-XXX"
        @input="onInput"
        maxlength="7"
      />
      <UiButton @click="searchOrder" :disabled="loading" :size="'min'">
        {{ loading ? 'Поиск...' : 'Найти' }}
      </UiButton>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <UiModal v-model="modalOpen" title="Детали заказа">
      <div v-if="orderDetails" class="order-info">
        <p>
          <strong>Номер:</strong>
          {{ formatWashinOrderNumber(orderDetails.orderNumber) }}
        </p>
        <p><strong>Клиент:</strong> {{ orderDetails.customerName }}</p>
        <p><strong>Телефон:</strong> {{ orderDetails.customerPhone }}</p>
        <p>
          <strong>Дата и время стирки:</strong>
          {{ formatDateOrder(orderDetails.scheduledAt) }},
          {{ formatTime(orderDetails.scheduledAt) }}
        </p>
        <p v-if="orderDetails.comment">
          <strong>Комментарий:</strong> {{ orderDetails.comment }}
        </p>
        <p><strong>Типы стирки:</strong></p>
        <ul>
          <li v-for="wt in orderDetails.washTypes" :key="wt.washType.id">
            {{ wt.washType.name }}
          </li>
        </ul>
      </div>

      <template #footer>
        <UiButton
          @click="modalOpen = false"
          :color="'var(--color-red)'"
          :size="'min'"
        >
          Закрыть
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
  const displayNumber = ref('');
  const loading = ref(false);
  const error = ref('');
  const modalOpen = ref(false);
  const orderDetails = ref(null);

  function onInput(event) {
    let raw = event.target.value.replace(/\D/g, '');
    if (raw.length > 6) raw = raw.slice(0, 6);

    let formatted = raw;
    if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
    }
    displayNumber.value = formatted;
  }

  async function searchOrder() {
    const digits = displayNumber.value.replace(/\D/g, '');
    if (digits.length !== 6) {
      error.value = 'Введите 6 цифр в формате XXX-XXX';
      return;
    }

    loading.value = true;
    error.value = '';

    try {
      const data = await $fetch(`/api/orders/${digits}`);
      orderDetails.value = data;
      modalOpen.value = true;
    } catch (err) {
      if (err.statusCode === 404) {
        error.value = 'Заказ с таким номером не найден';
      } else {
        error.value = err.statusMessage || 'Ошибка при поиске заказа';
      }
      orderDetails.value = null;
    } finally {
      loading.value = false;
    }
  }
</script>

<style scoped lang="scss">
  .order-search {
    width: 92vw;
    max-width: 900px;
    margin: 2rem auto;
  }
  .search-bar {
    display: flex;
    flex-direction: column;
  }
  .error {
    color: var(--color-red);
    margin-top: 0.5rem;
  }
  .order-info p {
    margin: 0.5rem 0;
    & strong {
      font-weight: 600;
    }
  }
</style>
