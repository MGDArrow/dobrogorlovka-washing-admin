<template>
  <div class="wash-types">
    <div v-if="loading">Загрузка...</div>
    <div v-else-if="washTypes.length === 0">Нет добавленных типов стирок</div>
    <div v-else class="wash-types__list">
      <div v-for="type in washTypes" :key="type.id" class="wash-types__item">
        <div class="wash-types__infoplate">
          <h5>{{ type.name }}</h5>
          <div v-if="type.description">
            {{ type.description }}
          </div>
          <div class="wash-types__info">
            <span
              :class="{ inactive: !type.isActive }"
              class="wash-types__status"
            >
              {{ type.isActive ? 'Активен' : 'Отключён' }}
            </span>
            <span v-if="type.temperature">🌡️ {{ type.temperature }}°C</span>
            <span v-if="type.dryingSpin">🌀 {{ type.dryingSpin }} об/мин</span>
          </div>
        </div>
        <div class="wash-types__actions">
          <UiButton
            :color="type.isActive ? 'var(--color-red)' : 'var(--color-green)'"
            :size="'min'"
            @click="toggleActive(type)"
          >
            {{ type.isActive ? 'Выключить' : 'Включить' }}
          </UiButton>
          <UiButton
            :color="'var(--color-blue)'"
            :size="'min'"
            @click="openEditModal(type)"
          >
            Редактировать
          </UiButton>
          <UiButton
            :color="'var(--color-red)'"
            :size="'min'"
            @click="confirmDelete(type)"
          >
            Удалить
          </UiButton>
        </div>
      </div>
    </div>

    <div class="wash-types__add">
      <UiInput v-model="newName" label="Название" />
      <UiInput v-model="newDescription" label="Описание" />
      <UiInput
        v-model.number="newTemperature"
        label="Температура (°C)"
        type="number"
      />
      <UiInput
        v-model.number="newDryingSpin"
        label="Обороты сушки (об/мин)"
        type="number"
      />
    </div>
    <UiButton :color="'var(--color-green)'" @click="createWashType">
      Добавить
    </UiButton>

    <UiModal v-model="isEditModalVisible" title="Редактировать тип стирки">
      <div class="wash-types__add">
        <UiInput v-model="editForm.name" label="Название" />
        <UiInput v-model="editForm.description" label="Описание" />
        <UiInput
          v-model.number="editForm.temperature"
          label="Температура (°C)"
          type="number"
        />
        <UiInput
          v-model.number="editForm.dryingSpin"
          label="Обороты сушки (об/мин)"
          type="number"
        />
      </div>
      <template #footer>
        <UiButton
          :color="'var(--color-red)'"
          :size="'min'"
          @click="isEditModalVisible = false"
        >
          Отмена
        </UiButton>

        <UiButton
          :color="'var(--color-green)'"
          :size="'min'"
          @click="updateWashType"
        >
          Сохранить
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue';

  interface WashType {
    id: number;
    name: string;
    description: string;
    isActive: boolean;
    temperature: number;
    dryingSpin: number;
  }

  const washTypes = ref<WashType[]>([]);
  const loading = ref(false);

  // Форма добавления
  const newName = ref('');
  const newDescription = ref('');
  const newTemperature = ref<number>(30);
  const newDryingSpin = ref<number>(800);

  // Редактирование
  const isEditModalVisible = ref(false);
  const editForm = ref<WashType>({
    id: 0,
    name: '',
    description: '',
    isActive: true,
    temperature: 30,
    dryingSpin: 800,
  });

  async function loadWashTypes() {
    loading.value = true;
    try {
      const data = await $fetch('/api/wash-types');
      washTypes.value = data;
    } catch (err) {
      console.error('Ошибка загрузки типов стирок', err);
    } finally {
      loading.value = false;
    }
  }

  async function createWashType() {
    if (!newName.value.trim()) {
      alert('Введите название типа стирки');
      return;
    }
    try {
      await $fetch('/api/wash-types', {
        method: 'POST',
        body: {
          name: newName.value.trim(),
          description: newDescription.value.trim() || null,
          isActive: true,
          temperature: newTemperature.value ?? null,
          dryingSpin: newDryingSpin.value ?? null,
        },
      });
      newName.value = '';
      newDescription.value = '';
      newTemperature.value = 30;
      newDryingSpin.value = 800;
      await loadWashTypes();
      alert('Тип стирки добавлен');
    } catch (err: any) {
      console.error(err);
      alert(err.data?.message || 'Ошибка при добавлении');
    }
  }

  async function toggleActive(type: WashType) {
    try {
      await $fetch(`/api/wash-types/${type.id}`, {
        method: 'PUT',
        body: { isActive: !type.isActive },
      });
      await loadWashTypes();
    } catch (err: any) {
      alert(err.data?.message || 'Не удалось изменить статус');
    }
  }

  function openEditModal(type: WashType) {
    editForm.value = { ...type };
    isEditModalVisible.value = true;
  }

  async function updateWashType() {
    if (!editForm.value.name.trim()) {
      alert('Название не может быть пустым');
      return;
    }
    try {
      await $fetch(`/api/wash-types/${editForm.value.id}`, {
        method: 'PUT',
        body: {
          name: editForm.value.name.trim(),
          description: editForm.value.description?.trim() || null,
          isActive: editForm.value.isActive,
          temperature: editForm.value.temperature ?? null,
          dryingSpin: editForm.value.dryingSpin ?? null,
        },
      });
      isEditModalVisible.value = false;
      await loadWashTypes();
      alert('Тип стирки обновлён');
    } catch (err: any) {
      alert(err.data?.message || 'Ошибка при обновлении');
    }
  }

  async function confirmDelete(type: WashType) {
    const isConfirmed = confirm(`Удалить тип "${type.name}"?`);
    if (!isConfirmed) return;
    try {
      await $fetch(`/api/wash-types/${type.id}`, { method: 'DELETE' });
      await loadWashTypes();
      alert('Тип стирки удалён');
    } catch (err: any) {
      alert(err.data?.message || 'Не удалось удалить');
    }
  }

  onMounted(() => {
    loadWashTypes();
  });
</script>

<style scoped lang="scss">
  .wash-types {
    background: var(--color-white);
    border: 4px solid var(--color-black);
    border-radius: var(--border-radius);
    padding: 1em;

    &__add {
      display: flex;
      gap: 1em;
      align-items: center;
      @media (width <= 768px) {
        gap: 0.2em;
        flex-direction: column;
      }
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 0.75em;
    }

    &__item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5em;
      gap: 1em;
      @media (width <= 768px) {
        flex-direction: column;
        gap: 0.2em;
      }
    }

    &__infoplate {
      display: flex;
      flex-direction: column;
      gap: 1em;
      flex: 1;
      @media (width <= 768px) {
        gap: 0.2em;
      }
    }

    &__info {
      display: flex;
      gap: 1em;
      align-items: baseline;
      flex-wrap: wrap;
      @media (width <= 768px) {
        gap: 0.2em;
      }
    }

    &__status {
      font-size: 0.8em;
      padding: 0.2em 0.5em;
      border-radius: var(--border-radius);
      background: var(--color-green);
      color: var(--color-white);
      &.inactive {
        background: var(--color-red);
      }
    }

    &__actions {
      width: 30%;
      display: flex;
      gap: 0.5em;
      align-items: center;
      flex-wrap: wrap;
      @media (width <= 768px) {
        gap: 0.2em;
        width: 100%;
      }
    }
  }
</style>
