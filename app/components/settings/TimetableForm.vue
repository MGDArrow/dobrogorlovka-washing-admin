<template>
  <form @submit.prevent="openConfirmModal" class="timetable__change-form">
    <UiInputDate
      required
      v-model="dateChangeTimetable"
      label="Изменить расписание с:"
      :min="minDateForNew"
    />
    <div v-for="weekday in weekdays" :key="weekday" class="timetable__days">
      <div
        class="timetable__name"
        :class="{ active: weekday in timetable }"
        @click="addWeekday(weekday)"
      >
        {{ weekday }}
      </div>
      <div class="timetable__times" v-if="weekday in timetable">
        <div v-for="(_, index) in timetable[weekday]" :key="index">
          <input type="time" v-model="timetable[weekday][index]" required />
        </div>
        <div class="add" @click="addTime(weekday)">+</div>
      </div>
    </div>
    <UiButton type="submit">Изменить</UiButton>
  </form>
  <!-- Модальное окно подтверждения изменения -->
  <UiModalConfirm
    v-model="isModalVisible"
    title="Подтверждение изменения"
    message="Вы уверены, что хотите изменить расписание?"
    confirm-text="Да, изменить"
    cancel-text="Отмена"
    @confirm="submit"
  />
</template>

<script setup lang="ts">
  const emit = defineEmits<{
    loadCurrent: [];
  }>();

  const weekdays = [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
    'Воскресенье',
  ];

  const dateChangeTimetable = ref('');
  const timetable: Reactive<{ [key: string]: Array<string> }> = reactive({});
  const isModalVisible = ref(false);

  const minDateForNew = computed(() => {
    const today = new Date();
    return formatDate(today);
  });

  // Форматирование для поля <input type="date">
  function formatDate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addWeekday(weekday: string) {
    if (weekday in timetable) {
      delete timetable[weekday];
    } else {
      timetable[weekday] = [];
    }
  }

  function addTime(weekday: string) {
    timetable[weekday]?.push('09:00');
  }

  function openConfirmModal() {
    if (Object.keys(timetable).length === 0) {
      alert('Добавьте хотя бы один день с временем');
      return;
    }
    if (!dateChangeTimetable.value) {
      alert('Выберите дату начала действия');
      return;
    }
    isModalVisible.value = true;
  }

  async function submit() {
    try {
      await $fetch('/api/schedule', {
        method: 'POST',
        body: {
          effectiveFrom: dateChangeTimetable.value,
          timetable: { ...timetable },
        },
      });
      Object.keys(timetable).forEach((key) => delete timetable[key]);
      alert('Новое расписание успешно сохранено');
      emit('loadCurrent');
    } catch (err: any) {
      console.error('Ошибка сохранения', err);
      const message = err.data?.message || 'Не удалось сохранить расписание';
      alert(message);
    } finally {
      isModalVisible.value = false;
    }
  }

  onMounted(() => {
    dateChangeTimetable.value = minDateForNew.value;
  });
</script>

<style scoped lang="scss">
  .timetable {
    &__change-form {
      border: 4px solid var(--color-black);
      padding: 1em;
      border-radius: var(--border-radius);
      margin-bottom: 1.5em;
    }

    &__days {
      display: flex;
      margin: 10px 0;
      gap: 0.5em;
    }

    &__name {
      width: 20%;
      text-align: center;
      padding: 0.5em;
      border: 2px solid var(--color-black);
      border-radius: var(--border-radius);
      text-transform: uppercase;
      font-weight: 600;
      cursor: pointer;
      min-width: max-content;
      transition: 0.3s ease-in-out;
      display: flex;
      align-items: center;
      justify-content: center;

      &.active {
        background: var(--color-green);
        color: var(--color-white);
      }
    }

    &__times {
      flex: 1;
      gap: 0.5em;
      display: flex;
      overflow-x: auto;

      & div {
        padding: 0.5em;
        border: 2px solid var(--color-black);
        border-radius: var(--border-radius);

        &.add {
          width: max-content;
          cursor: pointer;
          border-style: dashed;
          display: flex;
          align-items: center;
        }
      }
    }

    & input {
      border: 1px solid var(--color-black);
    }
  }
</style>
