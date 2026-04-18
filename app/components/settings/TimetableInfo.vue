<template>
  <div class="timatable__info">
    <div v-for="date in sortedDates" :key="date[0]">
      <span>{{ date[0] }}:</span>
      <span>{{ date[1].join(', ') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    data: Record<string, string[]>;
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

  const sortedDates = computed(() => {
    const arrayDates = Object.entries(props.data);
    return arrayDates.sort(
      (a, b) =>
        weekdays.findIndex((day) => day === a[0]) -
        weekdays.findIndex((day) => day === b[0]),
    );
  });
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
