<template>
  <div>
    <div class="pwa" v-if="pwaPopup">
      <div class="pwa__title">Установить приложение?</div>
      <div class="pwa__info">Установите приложение для удобства</div>
      <div class="pwa__btns">
        <UiButton
          :size="'min'"
          :color="'var(--color-red)'"
          @click="pwaPopup = false"
        >
          Нет
        </UiButton>
        <UiButton
          :size="'min'"
          :color="'var(--color-green)'"
          @click="installPWA()"
        >
          Да
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const pwaPopup = ref(false);
  let installPrompt: Event | null = null;

  async function installPWA() {
    if (!installPrompt) {
      return;
    }
    const result = await installPrompt.prompt();
    console.log(`Install prompt was: ${result.outcome}`);
    installPrompt = null;
    pwaPopup.value = false;
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      pwaPopup.value = true;
      installPrompt = event;
    });
  });
</script>

<style scoped lang="scss">
  .pwa {
    box-sizing: border-box;
    width: 90vw;
    min-width: 350px;
    max-width: 1650px;
    position: fixed;
    bottom: 20px;
    // min-height: 10dvh;
    left: 50%;
    transform: translateX(-50%);
    border-radius: var(--border-radius);
    z-index: 998;
    padding: 20px;
    background: var(--color-white);
    border: 4px solid var(--color-blue);
    animation: kf-open 1s forwards ease-in-out;
    &__title {
      box-sizing: border-box;
      margin: 0 auto;
      text-align: center;
      border-radius: var(--border-radius);
      color: var(--color-blue);
      font-weight: 600;
      font-size: 1.4em;
      @media (width <= 768px) {
        font-size: 1.1em;
      }
    }
    &__info {
      margin-top: 10px;
    }
    &__btns {
      width: 40%;
      margin: 0 auto;
      display: flex;
      gap: 20px;
      @media (width <= 768px) {
        width: 100%;
      }
    }
    &__btn {
      flex: 1;
      text-align: center;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-red);
      cursor: pointer;
    }
  }

  @keyframes kf-open {
    0% {
      bottom: -200dvh;
    }
    100% {
      bottom: 20px;
    }
  }
</style>
