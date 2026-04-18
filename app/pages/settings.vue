<template>
  <section class="settings">
    <h2>Расписание</h2>
    <SettingsTimetable />
    <h2>Типы стирок</h2>
    <SettingsWashTypes />
  </section>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
  .settings {
    @media (width <= 768px) {
      width: 95vw;
      margin: 0 auto;
    }
  }
</style>
