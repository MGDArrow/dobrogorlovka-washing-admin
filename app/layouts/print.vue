<!-- layouts/print.vue -->
<template>
  <div class="print-layout">
    <slot />
  </div>
</template>

<style scoped lang="scss">
  .print-layout {
    margin: 0 auto;
    padding: 0 2cm;
    width: 29.7cm;
    box-sizing: border-box;
    outline: 1px solid red;
  }
</style>
