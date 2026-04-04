<template>
  <UiModal v-model="localVisible" :title="title">
    <p class="modal-message">{{ message }}</p>
    <template #footer>
      <UiButton :color="'var(--color-red)'" :size="'min'" @click="close">
        {{ cancelText }}
      </UiButton>
      <UiButton @click="confirm" :size="'min'">
        {{ confirmText }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
  const props = defineProps<{
    modelValue: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'confirm'): void;
  }>();

  const localVisible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  });

  function close() {
    emit('update:modelValue', false);
  }

  function confirm() {
    emit('confirm');
    close();
  }
</script>

<style scoped lang="scss">
  .modal-message {
    margin: 1.5rem 0;
    text-align: center;
  }
</style>
