// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  nitro: {
    preset: 'node-server',
  },
  devtools: { enabled: true },
  css: ['./assets/reset.css', './assets/variables.css', './assets/styles.css'],
  runtimeConfig: {
    authCookieSecret: process.env.NUXT_AUTH_COOKIE_SECRET,
  },
  app: {
    head: {
      title: 'Стирка Добра',
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=2',
      htmlAttrs: {
        lang: 'ru',
      },
      meta: [
        {
          name: 'description',
          content:
            'Упрвление стирками — Официальный сайт Автономной Некомерческой Организации "ДоброГорловка"',
        },
        { name: 'keywords', content: 'АНО, Доброгорловка' },
        { name: 'theme-color', content: '#a6c729' },
        { name: 'author', content: 'MGDArrow' },
        { name: 'creator', content: 'MGDArrow' },
        { name: 'robots', content: 'noindex' },
        {
          name: 'apple-mobile-web-app-title',
          content: 'Упрвление стирками — Доброгорловка',
        },
      ],
      link: [
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'manifest', href: '/manifest.json' },
      ],
    },
  },

  modules: ['@vite-pwa/nuxt'],
  pwa: {
    manifest: false,
    registerType: 'autoUpdate',
    devOptions: {
      enabled: true,
    },
  },
});
