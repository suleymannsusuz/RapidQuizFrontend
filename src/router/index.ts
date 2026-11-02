import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const APP_NAME = 'Rapid Quiz'

/** Testlerde bellek tabanlı history verebilmek için fabrika. */
export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      {
        path: '/',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
        meta: { title: 'Ana sayfa' },
      },
      {
        path: '/quiz/:category',
        name: 'quiz',
        component: () => import('@/views/QuizView.vue'),
        props: true,
        meta: { title: 'Quiz' },
      },
      {
        path: '/result',
        name: 'result',
        component: () => import('@/views/ResultView.vue'),
        meta: { title: 'Sonuç' },
      },
      {
        path: '/leaderboard/:category?',
        name: 'leaderboard',
        component: () => import('@/views/LeaderboardView.vue'),
        props: true,
        meta: { title: 'Skor tablosu' },
      },
      { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
    ],
    scrollBehavior: () => ({ top: 0 }),
  })

  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} · ${APP_NAME}` : APP_NAME
  })

  return router
}

export default createAppRouter()
