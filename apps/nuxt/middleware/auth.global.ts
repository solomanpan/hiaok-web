export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login' || to.path === '/register') return;
  const { session } = useApp();
  if (!session.value.token && !session.value.userUuid) return navigateTo('/login');
});
