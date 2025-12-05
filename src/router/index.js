import { createRouter, createWebHistory } from 'vue-router'
import ConfiguratorView from '../views/ConfiguratorView.vue'
import FeedView from '../views/FeedView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/', // http://localhost:5173/
      name: 'configurator', // internal name, can be anything
      component: ConfiguratorView,
    },
    {
      path: '/feed',
      name: 'feed',
      component: FeedView,
    },
  ],
})

export default router
