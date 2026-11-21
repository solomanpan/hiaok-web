export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login' || to.path === '/register') return;
  const { app } = useApp();
  if (!app.sessions.isSignedIn()) return navigateTo('/login');
});
