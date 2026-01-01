import { createRouter, createWebHistory } from 'vue-router'
import ConfiguratorView from '../views/ConfiguratorView.vue'
import FeedView from '../views/FeedView.vue'
import SignInView from '../views/SignInView.vue'
import SignUpView from '../views/SignUpView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/', // http://localhost:5173/
      name: 'signin', // internal name, can be anything
      component: SignInView,
      meta: { hideNavigation: true },
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignUpView,
      meta: { hideNavigation: true },
    },
    {
      path: '/configurator/:id?', // http://localhost:5173/configurator/123
      name: 'configurator', // internal name, can be anything
      component: ConfiguratorView,
      meta: { requiresAuth: true },
    },
    {
      path: '/feed',
      name: 'feed',
      component: FeedView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token');

  if (to.meta.requiresAuth && !token) {
    next({ name: 'signin' });
  } else if ((to.name === 'signin' || to.name === 'signup') && token) {
    next({ name: 'configurator' });
  } else {
    next();
  }
})

export default router
