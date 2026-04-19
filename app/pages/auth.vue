<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2 class="auth-title">Вход в закрытую зону</h2>
      <p class="auth-subtitle">Доступ разрешён только избранным</p>

      <form @submit.prevent="handleLogin" class="auth-form">
        <UiInput v-model="username" :placeholder="'Введите логин'" required />
        <UiInput v-model="password" :placeholder="'Введите пароль'" required />
        <UiButton type="submit">{{
          loading ? 'Проверка...' : 'Войти'
        }}</UiButton>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
  definePageMeta({
    middleware: 'auth', // чтобы не было циклического редиректа
  });

  const username = ref('');
  const password = ref('');
  const loading = ref(false);
  const errorMessage = ref('');

  const handleLogin = async () => {
    loading.value = true;
    errorMessage.value = '';

    try {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: {
          username: username.value,
          password: password.value,
        },
      });
      // Перенаправление на главную после успешного входа
      await navigateTo('/');
    } catch (error) {
      errorMessage.value =
        error.data?.statusMessage || 'Ошибка входа. Проверьте данные.';
    } finally {
      loading.value = false;
    }
  };
</script>

<style scoped>
  .auth-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    margin: 1em 0;
  }

  .auth-card {
    border-radius: 2rem;
    padding: 2rem 2rem 2rem 2rem;
    width: 100%;
    max-width: 420px;
    border: 3px solid var(--color-black);
    transition: all 0.3s ease;
  }

  .auth-title {
    text-align: center;
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    letter-spacing: -0.5px;
  }

  .auth-subtitle {
    text-align: center;
    margin-bottom: 2rem;
    font-size: 0.9rem;
  }

  .error-message {
    margin-top: 1.2rem;
    border-left: 4px solid var(--color-red);
    padding: 0.7rem;
    border-radius: 0.8rem;
    color: var(--color-red);
    font-size: 0.85rem;
    text-align: center;
  }
</style>
