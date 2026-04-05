<template>
  <div class="timatable__info">
    <div v-for="(times, day) in data" :key="day">
      <span>{{ day }}:</span>
      <span>{{ times.join(', ') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    data: Record<string, string[]>;
  }>();
</script>

<style scoped lang="scss">
  .timatable__info {
    width: 100%;
    & div {
      display: flex;
      gap: 0.5em;
      margin-top: 0.5em;
      font-size: 1rem;

      @media screen and (max-width: 768px) {
        flex-wrap: wrap;
        gap: 0.5em;
      }
      & span {
        &:first-child {
          font-weight: 700;
          text-transform: uppercase;
        }
      }
    }
  }
</style>
