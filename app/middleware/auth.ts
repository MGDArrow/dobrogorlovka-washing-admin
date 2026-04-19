export default defineNuxtRouteMiddleware((to, from) => {
  // Получаем подписанную куку
  const authCookie = useCookie('auth');

  const isAuthenticated = !!authCookie.value;

  if (!isAuthenticated && to.path !== '/auth') {
    return navigateTo('/auth');
  }

  if (isAuthenticated && to.path === '/auth') {
    return navigateTo('/');
  }
});
