<template>
  <div class="holidays">
    <!-- Список будущих выходных -->
    <div v-if="loading">Загрузка...</div>
    <div v-else-if="holidays.length === 0" class="holidays__empty">
      Нет запланированных выходных
    </div>
    <div v-else class="holidays__list">
      <div v-for="holiday in holidays" :key="holiday.id" class="holidays__item">
        <span>{{ formatHumanDate(holiday.date) }}</span>
        <UiButton
          :color="'var(--color-red)'"
          :size="'min'"
          @click="confirmDelete(holiday.id, holiday.date)"
        >
          Удалить
        </UiButton>
      </div>
    </div>
    <div class="holidays__add">
      <UiInputDate v-model="newDate" label="Дата выходного" :min="minDate" />
      <UiButton :color="'var(--color-green)'" @click="addHoliday">
        Добавить выходной
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue';

  interface Holiday {
    id: number;
    date: string;
  }

  const holidays = ref<Holiday[]>([]);
  const loading = ref(false);
  const newDate = ref('');

  const minDate = computed(() => {
    const today = new Date();
    return formatDate(today);
  });

  function formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatHumanDate(date: string | Date): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  async function loadHolidays() {
    loading.value = true;
    try {
      const data = await $fetch('/api/holidays');
      holidays.value = data;
    } catch (err) {
      console.error('Ошибка загрузки выходных', err);
    } finally {
      loading.value = false;
    }
  }

  async function addHoliday() {
    if (!newDate.value) {
      alert('Выберите дату');
      return;
    }
    try {
      await $fetch('/api/holidays', {
        method: 'POST',
        body: { date: newDate.value },
      });
      alert('Выходной день добавлен');
      newDate.value = '';
      await loadHolidays();
    } catch (err: any) {
      console.error('Ошибка добавления', err);
      const message = err.data?.message || 'Не удалось добавить выходной';
      alert(message);
    }
  }

  async function confirmDelete(id: number, date: string | Date) {
    const humanDate = formatHumanDate(date);
    const isConfirmed = confirm(`Удалить выходной день (${humanDate})?`);
    if (!isConfirmed) return;

    try {
      await $fetch(`/api/holidays/${id}`, { method: 'DELETE' });
      alert('Выходной удалён');
      await loadHolidays();
    } catch (err: any) {
      console.error('Ошибка удаления', err);
      alert(err.data?.message || 'Не удалось удалить');
    }
  }

  onMounted(() => {
    loadHolidays();
  });
</script>

<style scoped lang="scss">
  .holidays {
    background: var(--color-white);
    border: 4px solid var(--color-black);
    border-radius: var(--border-radius);
    padding: 1em;
    margin-bottom: 1.5em;

    &__add {
      display: flex;
      gap: 1em;
      margin-bottom: 1.5em;
      align-items: center;
      flex-wrap: wrap;
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 0.75em;
    }

    &__item {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0.5em;
      border-bottom: 1px solid var(--color-gray);
      gap: 1em;
      text-align: center;
      & > * {
        display: block;
        flex: 1;
      }
      & span {
        font-size: 1.2em;
      }
    }

    &__empty {
      color: var(--color-gray-dark);
      font-style: italic;
    }
  }
</style>
