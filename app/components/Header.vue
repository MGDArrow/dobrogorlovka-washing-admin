<template>
  <header>
    <img src="/logo.webp" alt="" />
    <h1>Стирка Добра</h1>
    <nav>
      <NuxtLink to="/">Стирки</NuxtLink>
      <NuxtLink to="/statistics">Статистика</NuxtLink>
      <NuxtLink to="/settings">Настройки</NuxtLink>
    </nav>
  </header>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
  header {
    img {
      display: block;
      width: 300px;
      margin: 20px auto;
    }
  }
  nav {
    width: 1600px;
    margin: 0 auto;
    justify-content: space-evenly;
    display: flex;
    flex-wrap: wrap;
    font-weight: 700;
    font-size: 1.3em;
    text-transform: uppercase;
    & a {
      display: block;
      text-align: center;
      width: max-content;
      margin: 0 10px;
      cursor: pointer;
      transition: 0.4s ease-in-out;
      color: var(--color-black);
      text-decoration: none;
      &:hover {
        transform: scale(1.03);
        &:nth-child(1n) {
          color: var(--color-green);
        }
        &:nth-child(2n) {
          color: var(--color-blue);
        }
        &:nth-child(3n) {
          color: var(--color-orange);
        }
        &:nth-child(4n) {
          color: var(--color-pink);
        }
      }
    }
    @media screen and (max-width: 1599px) {
      width: 1200px;
      & a {
        margin: 10px 70px;
      }
    }
    @media screen and (max-width: 1199px) {
      width: 769px;
      & a {
        margin: 10px;
      }
    }
    @media screen and (max-width: 768px) {
      width: 360px;
      font-size: 1em;
      & a {
        margin: 10px;
      }
    }
  }
</style>
