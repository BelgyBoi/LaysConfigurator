<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { logout } from './services/authService'
import { wakeUpApi } from './services/bagService'

const navRef = ref(null)
const router = useRouter()
const route = useRoute()

const handleLogout = () => {
  logout()
  router.push({ name: 'signin' })
}

onMounted(() => {
  wakeUpApi()
  if (navRef.value) {
    const height = navRef.value.offsetHeight
    document.documentElement.style.setProperty('--nav-height', `${height}px`)
  }
})
</script>

<template>
  <div class="app-root">
    <nav class="top-nav" ref="navRef" v-if="!route.meta.hideNavigation">
      <div class="nav-inner">
        <ul class="nav-links">
          <li><router-link to="/">Configurator</router-link></li>
          <li><router-link to="/feed">Vote Now</router-link></li>
        </ul>

        <button class="logout-btn" @click="handleLogout">Logout</button>
      </div>
    </nav>

    <main class="app-shell">
      <router-view />
    </main>
  </div>
</template>

<style>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

.top-nav {
  background: var(--accent-color);
  font-size: 1.25rem;
  font-weight: 600;
  flex: 0 0 auto; /* Don't shrink */
}

.nav-inner {
  margin: 0 auto;
  padding: 0.75rem 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-links {
  display: flex;
  gap: 1rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-links a {
  transition:
    transform 180ms ease-in-out,
    color 400ms ease-in-out;
}

.nav-links a:hover {
  transform: translate(-2px, -1px);
  text-shadow: 2px 2px 2px var(--orange);
  color: var(--background-color);
}

.nav-links a:active {
  text-shadow: 2px 2px 2px var(--background-color);
  color: var(--orange);
}

.logout-btn {
  border: none;
  background: var(--text-color);
  color: var(--background-color);
  cursor: pointer;
  font: inherit;
  transition: transform 180ms ease-in-out;
}

.logout-btn:hover {
  background-color: var(--red);
  transform: scale(1.05);
}

.logout-btn:active {
  transform: scale(0.95);
}

.app-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  /* padding: 0 15px; */
}
</style>
