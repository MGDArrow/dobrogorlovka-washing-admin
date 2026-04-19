<template>
  <div class="wrapper">
    <Header />
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
  .wrapper {
    max-width: 98vw;
    margin: 0 auto;
    padding-bottom: 1.5em;
  }
</style>
