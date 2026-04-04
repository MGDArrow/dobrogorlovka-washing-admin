<template>
  <div class="ui-input-date">
    <label>
      <p v-if="label">{{ label }}</p>
      <input
        type="date"
        v-model="modelValue"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        :required="required"
        :disabled="disabled"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
  interface Props {
    label?: string;
    placeholder?: string;
    min?: string;
    max?: string;
    required?: boolean;
    disabled?: boolean;
  }

  const modelValue = defineModel<string>({ required: true });
  defineProps<Props>();
</script>

<style scoped lang="scss">
  .ui-input-date {
    width: 100%;
    margin: 30px 0;
    @media screen and (max-width: 1199px) {
      margin: 20px 0;
    }
    @media screen and (max-width: 768px) {
      margin: 15px 0;
    }
    & p {
      width: calc(100% - 10px);
      margin-bottom: 5px;
      font-size: 1.2em;
      font-weight: 600;
      margin-left: 10px;
      @media screen and (max-width: 1199px) {
        font-size: 1em;
      }
      @media screen and (max-width: 768px) {
        font-size: 0.8em;
      }
    }
    & input {
      width: calc(100% - 28px);
      box-sizing: unset;
      height: 40px;
      border: 4px solid var(--color-black);
      border-radius: var(--border-radius);
      font-size: 1.2em;
      padding: 10px;
      @media screen and (max-width: 1199px) {
        width: calc(100% - 20px);
        font-size: 1em;
        padding: 6px;
        height: 35px;
      }
      @media screen and (max-width: 768px) {
        border: 3px solid var(--color-black);
        width: calc(100% - 14px);
        font-size: 0.8em;
        padding: 4px;
        height: 30px;
      }
    }
  }
</style>
