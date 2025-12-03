import { createRouter, createWebHistory } from 'vue-router';
import ConfiguratorView from '../views/ConfiguratorView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',                 // http://localhost:5173/
      name: 'configurator',      // internal name, can be anything
      component: ConfiguratorView,
    },
  ],
});

export default router;
