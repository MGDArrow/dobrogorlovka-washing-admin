<template>
  <div class="timetable">
    <h3>Текущее расписание</h3>
    <div class="timetable__current">
      <template v-if="currentSchedule">
        <h5>
          Действует с: {{ formatHumanDate(currentSchedule.effectiveFrom) }}
        </h5>
        <SettingsTimetableInfo :data="currentSchedule.timetableData" />
        <UiButton :color="'var(--color-blue)'" @click="openUpcomingModal">
          Будущие изменения
        </UiButton>
      </template>
      <template v-else-if="!loadingCurrent">
        Расписание ещё не задано. Создайте первое.
        <UiButton :color="'var(--color-blue)'" @click="openUpcomingModal">
          Будущие изменения
        </UiButton>
      </template>
      <template v-else>Загрузка...</template>
    </div>

    <h3>Изменить расписание</h3>
    <SettingsTimetableForm @loadCurrent="loadCurrentInfo()" />

    <h3>Выходные</h3>
    <SettingsHolidays />

    <!-- Модальное окно со списком будущих расписаний -->
    <UiModal
      v-model="isUpcomingModalVisible"
      title="Будущие изменения расписания"
    >
      <div v-if="loadingUpcoming">Загрузка...</div>
      <div v-else-if="upcomingSchedules.length === 0">
        Нет запланированных изменений
      </div>
      <div v-else>
        <div v-for="schedule in upcomingSchedules" :key="schedule.id">
          <h5>С {{ formatHumanDate(schedule.effectiveFrom) }}</h5>
          <SettingsTimetableInfo :data="schedule.timetableData" />
          <UiButton
            :color="'var(--color-red)'"
            :size="'min'"
            @click="confirmDelete(schedule.id, schedule.effectiveFrom)"
          >
            Удалить
          </UiButton>
        </div>
      </div>
      <template #footer>
        <UiButton :color="'var(--color-orange)'" @click="closeUpcomingModal">
          Закрыть
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
  import type { Reactive } from 'vue';
  import { ref, reactive, computed, onMounted } from 'vue';

  const currentSchedule = ref<any>(null);
  const loadingCurrent = ref(true);
  const timetable: Reactive<{ [key: string]: Array<string> }> = reactive({});

  const upcomingSchedules = ref<any[]>([]);
  const loadingUpcoming = ref(false);
  const isUpcomingModalVisible = ref(false);

  // Человекочитаемый формат: "25 января 2026 года"
  function formatHumanDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const formatted = d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    // Заменяем " г." на " года" для красоты
    return formatted.replace(' г.', ' года');
  }

  async function loadCurrentInfo() {
    loadingCurrent.value = true;
    try {
      const data = await $fetch('/api/schedule');
      currentSchedule.value = data;
    } catch (err) {
      console.error('Ошибка загрузки расписания', err);
    } finally {
      loadingCurrent.value = false;
    }
  }

  async function loadUpcomingSchedules() {
    loadingUpcoming.value = true;
    try {
      const data = await $fetch('/api/schedule/upcoming');
      upcomingSchedules.value = data;
    } catch (err) {
      console.error('Ошибка загрузки будущих расписаний', err);
      upcomingSchedules.value = [];
    } finally {
      loadingUpcoming.value = false;
    }
  }

  function openUpcomingModal() {
    isUpcomingModalVisible.value = true;
    loadUpcomingSchedules();
  }

  function closeUpcomingModal() {
    isUpcomingModalVisible.value = false;
  }

  async function confirmDelete(id: number, effectiveFrom: string | Date) {
    const humanDate = formatHumanDate(effectiveFrom);
    const isConfirmed = confirm(
      `Вы уверены, что хотите удалить расписание, действующее с ${humanDate}?`,
    );
    if (isConfirmed) {
      await deleteSchedule(id);
    }
  }

  async function deleteSchedule(id: number) {
    try {
      await $fetch(`/api/schedule/${id}`, { method: 'DELETE' });
      alert('Расписание успешно удалено');
      await loadUpcomingSchedules();
      await loadCurrentInfo();
    } catch (err: any) {
      console.error('Ошибка удаления', err);
      const message = err.data?.message || 'Не удалось удалить расписание';
      alert(message);
    }
  }

  onMounted(() => {
    loadCurrentInfo();
  });
</script>

<style scoped lang="scss">
  .timetable {
    width: 100%;
    &__current {
      margin: 0.5em 0;
      background: var(--color-white);
      border: 4px solid var(--color-black);
      border-radius: var(--border-radius);
      padding: 1em;
    }
  }
</style>
