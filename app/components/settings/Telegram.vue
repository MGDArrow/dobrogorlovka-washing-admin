<template>
  <div class="subscribers">
    <div v-if="loading">Загрузка...</div>
    <div v-else-if="subscribers.length === 0">
      Нет активированных подписчиков
    </div>
    <div v-else class="subscribers__list">
      <div v-for="user in subscribers" :key="user.id" class="subscribers__item">
        <div class="subscribers__info">
          <h5>
            {{ user.firstName || 'Без имени' }}
            <span v-if="user.username">(@{{ user.username }})</span>
          </h5>
          <div class="subscribers__details">
            <span
              >🆔 Telegram ID: <code>{{ user.telegramId }}</code></span
            >
            <span
              >📅 Активирован:
              {{ formatDate(user.activatedAt || user.createdAt) }}</span
            >
          </div>
        </div>
        <div class="subscribers__actions">
          <UiButton
            color="var(--color-red)"
            size="min"
            @click="confirmUnsubscribe(user)"
          >
            Отписать
          </UiButton>
        </div>
      </div>
    </div>

    <div class="subscribers__refresh">
      <UiButton
        color="var(--color-blue)"
        :size="'min'"
        @click="loadSubscribers"
      >
        Обновить список
      </UiButton>
    </div>

    <!-- Модальное окно подтверждения (опционально, можно заменить на confirm) -->
    <UiModal v-model="isConfirmModalVisible" title="Отписать пользователя">
      <p>
        Вы действительно хотите отписать пользователя
        <strong>{{
          selectedUser?.firstName ||
          selectedUser?.username ||
          selectedUser?.telegramId
        }}</strong>
        от рассылки?
      </p>
      <p>После отписки он перестанет получать уведомления о новых заказах.</p>
      <template #footer>
        <UiButton
          color="var(--color-orange)"
          :size="'min'"
          @click="isConfirmModalVisible = false"
        >
          Отмена
        </UiButton>
        <UiButton
          color="var(--color-red)"
          :size="'min'"
          @click="unsubscribeUser"
        >
          Отписать
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue';

  interface TelegramUser {
    id: number;
    telegramId: number;
    chatId: number;
    firstName?: string;
    username?: string;
    isActivated: boolean;
    activatedAt?: string;
    createdAt: string;
    updatedAt: string;
  }

  const subscribers = ref<TelegramUser[]>([]);
  const loading = ref(false);
  const isConfirmModalVisible = ref(false);
  const selectedUser = ref<TelegramUser | null>(null);

  async function loadSubscribers() {
    loading.value = true;
    try {
      // Предполагается эндпоинт, возвращающий всех активированных пользователей
      const data = await $fetch<TelegramUser[]>('/api/telegram-users');
      subscribers.value = data;
    } catch (err) {
      console.error('Ошибка загрузки подписчиков', err);
      alert('Не удалось загрузить список подписчиков');
    } finally {
      loading.value = false;
    }
  }

  function confirmUnsubscribe(user: TelegramUser) {
    selectedUser.value = user;
    isConfirmModalVisible.value = true;
  }

  async function unsubscribeUser() {
    if (!selectedUser.value) return;
    try {
      // Вариант 1: DELETE запрос, который деактивирует пользователя (isActivated = false)
      await $fetch(`/api/telegram-users/${selectedUser.value.id}`, {
        method: 'DELETE', // или PUT/PATCH в зависимости от вашей реализации
      });
      // Удаляем из списка локально
      subscribers.value = subscribers.value.filter(
        (u) => u.id !== selectedUser.value!.id,
      );
      alert('Пользователь отписан от рассылки');
    } catch (err: any) {
      console.error(err);
      alert(err.data?.message || 'Ошибка при отписке');
    } finally {
      isConfirmModalVisible.value = false;
      selectedUser.value = null;
    }
  }

  function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onMounted(() => {
    loadSubscribers();
  });
</script>

<style scoped lang="scss">
  .subscribers {
    background: var(--color-white);
    border: 4px solid var(--color-black);
    border-radius: var(--border-radius);
    padding: 1em;

    &__list {
      display: flex;
      flex-direction: column;
      gap: 0.75em;
      margin-bottom: 1em;
    }

    &__item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5em;
      gap: 1em;
      border-bottom: 1px solid #eee;

      &:last-child {
        border-bottom: none;
      }

      @media (width <= 768px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5em;
      }
    }

    &__info {
      flex: 1;
      h5 {
        margin: 0 0 0.25em 0;
        font-size: 1rem;
      }
    }

    &__details {
      display: flex;
      gap: 1em;
      font-size: 0.85rem;
      color: #555;
      flex-wrap: wrap;

      code {
        background: #f0f0f0;
        padding: 0.1em 0.3em;
        border-radius: 4px;
      }
    }

    &__actions {
      display: flex;
      gap: 0.5em;
      @media (width <= 768px) {
        width: 100%;
      }
    }

    &__refresh {
      display: flex;
      justify-content: center;
      margin-top: 1em;
    }
  }
</style>
