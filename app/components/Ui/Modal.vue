<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal-overlay"
      @click.self="close"
      @keydown.esc="close"
    >
      <div class="modal-container">
        <div v-if="$slots.header || title" class="modal-header">
          <slot name="header">
            <h3>{{ title }}</h3>
          </slot>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  defineProps<{
    modelValue: boolean;
    title?: string;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
  }>();

  function close() {
    emit('update:modelValue', false);
  }
</script>

<style scoped lang="scss">
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-container {
    background: var(--color-white);
    border-radius: var(--border-radius);
    border: 4px solid var(--color-black);
    padding: 1.5rem;
    max-width: 90%;
    width: auto;
    min-width: 300px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    margin-bottom: 1rem;
  }

  .modal-body {
    // Содержимое
  }

  .modal-footer {
    margin-top: 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }
</style>
