<script setup>
import { ref, onMounted } from 'vue';
import { getAllBags, voteForBag } from '../services/bagService';

const bags = ref([]);
const isLoading = ref(true);
const error = ref(null);

onMounted(() => {
  fetchBags();
});

async function fetchBags() {
  try {
    isLoading.value = true;
    const data = await getAllBags();
    bags.value = Array.isArray(data) ? data : (data.lays || []);
  } catch (err) {
    error.value = "Failed to load the flavor feed. " + err.message;
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

async function handleVote(bag) {
  if (bag.hasVoted) return; // Prevent double voting locally
  try {
    // Optimistic update
    bag.votes = (bag.votes || 0) + 1;
    bag.hasVoted = true;
    bag.justVoted = true;

    const updatedBag = await voteForBag(bag._id);
    // Update local state with actual data from server
    if (updatedBag && typeof updatedBag.votes === 'number') {
      bag.votes = updatedBag.votes;
    }

    setTimeout(() => bag.justVoted = false, 1000);
  } catch (e) {
    console.error("Vote failed", e);
    // Revert optimistic update on failure
    bag.votes = Math.max(0, (bag.votes || 0) - 1);
    bag.hasVoted = false;
    bag.justVoted = false;
    alert("Could not register vote.");
  }
}
</script>

<template>
  <div class="feed-container">
    <div class="light-effect"></div>

    <div class="content-wrapper">
      <header class="feed-header">
        <h1>Flavor Feed</h1>
      </header>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Frying up the feed...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>⚠️ {{ error }}</p>
        <button @click="fetchBags" class="retry-btn">Try Again</button>
      </div>

      <div v-else class="feed-stream">
        <article
          v-for="bag in bags"
          :key="bag._id"
          class="social-card"
        >
          <!-- 1. Header -->
          <div class="card-header">
            <div class="user-avatar-placeholder">
              {{ (bag.creator || 'L').charAt(0).toUpperCase() }}
            </div>
            <div class="header-info">
              <span class="username">{{ bag.creator || 'Lays Fan' }}</span>
              <span class="location" v-if="bag.packaging">Configured on {{ bag.packaging }} packaging</span>
            </div>
          </div>

          <!-- 2. Media -->
          <div class="card-media" @dblclick="handleVote(bag)">
            <div class="fit-container">
               <template v-if="bag.image">
                  <img :src="bag.image" alt="Bag Preview" class="social-image" />
               </template>
               <div v-else class="css-bag-only">
                 <div class="bag-logo">
                   <img src="/assets/logo-lays.png" alt="Lays" />
                 </div>
               </div>

               <div class="heart-overlay" :class="{ 'animate': bag.justVoted }">❤️</div>
            </div>
          </div>

          <!-- 3. Actions -->
          <div class="card-actions">
            <div class="likes-count">
              <strong>{{ bag.votes || 0 }} likes</strong>
            </div>
            <div class="action-buttons">
              <button
                @click="handleVote(bag)"
                class="action-btn"
                :class="{ 'liked': bag.hasVoted }"
                title="Like"
              >
                <svg v-if="bag.hasVoted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ed4956" width="28" height="28"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </button>
            </div>
          </div>

          <!-- 4. Caption & Details -->
          <div class="card-caption">
            <div class="caption-text">
              <span class="username">{{ bag.creator || 'Lays Fan' }}</span>
              <span class="flavor-name">✨ {{ bag.name || 'Mystery Flavor' }}</span>
              <br>
              <span class="inspiration" v-if="bag.inspiration">
                {{ bag.inspiration }}
              </span>
            </div>

            <div class="key-flavors" v-if="bag.keyFlavours && bag.keyFlavours.length">
              <span v-for="flavour in bag.keyFlavours" :key="flavour" class="hashtag">
                #{{ flavour.replace(/\s+/g, '') }}
              </span>
            </div>
          </div>
        </article>
      </div>

      <!-- Empty State -->
      <div v-if="!isLoading && !error && bags.length === 0" class="empty-state">
        <p>No flavors yet! Be the first to create one.</p>
        <router-link to="/" class="create-btn">Create Flavor</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feed-container {
  min-height: 100vh;
  width: 100%;
  background-color: #fafafa;
  overflow-y: auto;
  padding-bottom: 4rem;
}

.content-wrapper {
  max-width: 500px; /* Stream/Phone width */
  margin: 0 auto;
  padding: 2rem 0; /* No side padding for full-bleed mobile look */
}

.feed-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 0 1rem;
}

.feed-header h1 {
  font-family: 'Pacifico', cursive; /* Or the app's script font */
  font-size: 2rem;
  color: #1f1f1f;
  margin: 0;
}

/* Social Card */
.social-card {
  background: white;
  border: 1px solid #dbdbdb;
  border-radius: 8px; /* Slightly rounded */
  margin-bottom: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 1. Header */
.card-header {
  display: flex;
  align-items: center;
  padding: 14px;
  gap: 12px;
}

.user-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: rgba(0,0,0,0.5);
  border: 1px solid rgba(0,0,0,0.1);
}

.header-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.username {
  font-weight: 600;
  font-size: 14px;
  color: #262626;
  text-decoration: none;
}

.location {
  font-size: 12px;
  color: #8e8e8e;
}

/* 2. Media */
.card-media {
  width: 100%;
  padding-top: 125%; /* 4:5 Aspect Ratio */
  position: relative;
  background-color: #ffffff; /* Was #f8e503 */
  overflow: hidden;
  cursor: grab; /* Indicates interactive */
}

.card-media:active {
  cursor: grabbing;
}

.fit-container {
  position: absolute; /* Match parent */
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ffffff; /* Was #f8e503 */
}

/* 3D Scene */
.scene-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: transparent;
}

/* Static Preview */
.static-preview {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.social-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.15));
  /* No hover effect needed as it usually transitions to 3D instantly */
}

/* CSS Fallback */
.css-bag-only {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 20px;
}
.bag-logo img { width: 100px; opacity: 0.6; }

/* 3. Actions */
.card-actions {
  padding: 10px 14px 0;
  display: flex;
  flex-direction: row; /* Horizontal */
  justify-content: space-between; /* Space out */
  align-items: center;
  gap: 8px;
}

.action-buttons {
  order: 2; /* Move to right */
}

.likes-count {
  font-size: 14px;
  color: #262626;
  order: 1; /* Move to left */
}

.action-btn {
  background: none;
  border: 1px solid #dbdbdb; /* Outlined */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #f0f0f0;
  border-color: #c0c0c0;
}

.action-btn.liked {
  border-color: #ed4956;
  background-color: #fff0f1;
}

.action-btn:active {
  transform: scale(0.9);
}

.action-btn.liked svg {
  animation: heart-burst 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes heart-burst {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

/* 4. Caption */
.card-caption {
  padding: 8px 14px 16px;
  font-size: 14px;
  line-height: 1.5;
}

.flavor-name {
  font-weight: 700;
  margin-left: 6px;
  color: #262626;
}

.inspiration {
  display: block;
  margin-top: 4px;
  color: #444;
}

.key-flavors {
  margin-top: 8px;
  color: #00376b;
  font-size: 14px;
}

.hashtag {
  margin-right: 6px;
  cursor: pointer;
}

.hashtag:hover {
  text-decoration: underline;
}

/* Heart Overlay Animation */
.heart-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  font-size: 80px;
  pointer-events: none;
  opacity: 0;
  transition: all 0.3s;
}

/* Loading/Error */
.loading-state, .error-state, .empty-state {
  text-align: center;
  background: white;
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #eee;
  border-top-color: var(--red);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin { to { transform: rotate(360deg); } }

.retry-btn, .create-btn {
  background: var(--blue);
  color: white;
  border: none;
  padding: 10px 25px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 1rem;
  text-decoration: none;
  display: inline-block;
}
</style>
