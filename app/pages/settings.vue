<template>
  <section class="settings">
    <h2>Расписание</h2>
    <SettingsTimetable />
    <h2>Типы стирок</h2>
    <SettingsWashTypes />
    <h2>Телеграм рассылка</h2>
    <SettingsTelegram />
  </section>
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
  });
</script>

<style scoped lang="scss">
  .settings {
    @media (width <= 768px) {
      width: 95vw;
      margin: 0 auto;
    }
  }
</style>
