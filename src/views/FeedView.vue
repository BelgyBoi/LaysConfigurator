<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAllBags, voteForBag } from '../services/bagService';
import BagPreview from '@/components/BagPreview.vue';

const bags = ref([]);
const isLoading = ref(true);
const error = ref(null);

// Pagination / Carousel Logic
const ITEMS_PER_PAGE = 3
const currentPage = ref(0)

const visibleBags = computed(() => {
  const start = currentPage.value * ITEMS_PER_PAGE
  return bags.value.slice(start, start + ITEMS_PER_PAGE)
})

const hasNext = computed(() => {
  return (currentPage.value + 1) * ITEMS_PER_PAGE < bags.value.length
})

const hasPrev = computed(() => {
  return currentPage.value > 0
})

function nextPage() {
  if (hasNext.value) currentPage.value++
}

function prevPage() {
  if (hasPrev.value) currentPage.value--
}

async function fetchBags() {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await getAllBags();
    // Sort by votes (most votes first)
    bags.value = Array.isArray(data) ? data.sort((a, b) => (b.votes || 0) - (a.votes || 0)) : [];
  } catch (err) {
    error.value = "Failed to load the feed. Please try again.";
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

async function handleVote(bag) {
  // Allow toggling (Optimistic UI)
  const wasVoted = bag.hasVoted;

  // Toggle state
  bag.hasVoted = !wasVoted;
  bag.votes = (bag.votes || 0) + (bag.hasVoted ? 1 : -1);
  bag.justVoted = bag.hasVoted;

  if (bag.justVoted) {
      setTimeout(() => bag.justVoted = false, 1000);
  }

  try {
    const updatedBag = await voteForBag(bag._id);
    // Update real count from server if available
    if (updatedBag && typeof updatedBag.votes === 'number') {
      bag.votes = updatedBag.votes;
    }
  } catch (e) {
    console.error("Vote failed", e);
    // Revert optimistic update
    bag.hasVoted = wasVoted;
    bag.votes = (bag.votes || 0) + (wasVoted ? 1 : -1);
  }
}

// editBag function removed as it is no longer used in the feed

onMounted(() => {
  fetchBags();
});
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

      <div v-else class="carousel-container">
         <div class="shelf-grid">
            <div
              v-for="bag in visibleBags"
              :key="bag._id"
              class="shelf-item"
            >
               <div class="shelf-bag-preview">
                  <BagPreview
                      :color="bag.bagColor"
                      :pattern="bag.pattern"
                      :packaging="bag.packaging"
                      :name="bag.name"
                      :font="bag.font"
                      :image="bag.image"
                      :read-only="true"
                      :auto-rotate="false"
                      :show-background="false"
                      content-mode="shelf"
                  />
                  <!-- Overlay for actions -->
                  <div class="shelf-overlay">
                     <!-- Edit button removed per request -->
                  </div>
               </div>
               <div class="shelf-label">
                  <div class="header-row">
                      <strong>{{ bag.name }}</strong>
                      <button class="votes-pill" @click.stop="handleVote(bag)">
                         {{ bag.hasVoted ? '❤️' : '🤍' }} {{ bag.votes || 0 }}
                      </button>
                  </div>
                  <div class="flavors-row" v-if="bag.keyFlavours && bag.keyFlavours.length">
                      {{ Array.isArray(bag.keyFlavours) ? bag.keyFlavours.join(', ') : bag.keyFlavours }}
                  </div>
                  <span class="author">by {{ bag.creator || 'Lays Fan' }}</span>
               </div>
            </div>
         </div>

         <!-- Controls -->
         <div class="carousel-controls">
            <button class="nav-btn prev" @click="prevPage" :disabled="!hasPrev">
               &larr; Previous Shelf
            </button>
            <span class="page-indicator">Page {{ currentPage + 1 }}</span>
            <button class="nav-btn next" @click="nextPage" :disabled="!hasNext">
               Next Shelf &rarr;
            </button>
         </div>
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
  background: radial-gradient(circle at top left, #fff9c4, #fff); /* Subtle yellow burst */
  background-size: cover;
  overflow-y: auto;
  padding-bottom: 4rem;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.feed-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 0 1rem;
}

.feed-header h1 {
  font-family: 'Pacifico', cursive;
  font-size: 2rem;
  color: #1f1f1f;
  margin: 0;
}

/* Light effect removed */

/* Shelf Grid */
.carousel-container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.shelf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 40px;
  margin-bottom: 40px;
  min-height: 500px;
}

.shelf-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  perspective: 1000px;
}

.shelf-bag-preview {
  width: 100%;
  aspect-ratio: 1; /* Square for 3D view */
  background: repeating-conic-gradient(
      from 0deg,
      #f8e503 0deg 10deg,
      #f2b705 10deg 20deg
    );
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  position: relative;
  overflow: hidden;
  transition: transform 0.3s;
}

.shelf-bag-preview:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 15px 40px rgba(0,0,0,0.15);
}

.shelf-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
/* Re-enable pointer events on buttons */
.shelf-overlay button {
  pointer-events: auto;
}

.shelf-bag-preview:hover .shelf-overlay {
  opacity: 1;
}

.shelf-btn {
  background: white;
  border: none;
  padding: 8px 12px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 14px;
}

.shelf-btn:hover {
  background: #f8e503;
}

.vote-btn.voted {
  color: #ed4956;
}

.shelf-label {
  margin-top: 16px;
  text-align: left;
  width: 100%;
  padding: 0 8px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.votes-pill {
  background: #eee;
  border: none;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #444;
  cursor: pointer;
  transition: background 0.2s;
}

.votes-pill:hover {
  background: #e0e0e0;
}

.flavors-row {
  font-size: 0.9rem;
  color: #d32f2f; /* Lay's Red or similar accent */
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shelf-label strong {
  font-size: 1.1rem;
  color: #1f1f1f;
}

.shelf-label .author {
  font-size: 0.8rem;
  color: #888;
  display: block;
}

/* Controls */
.carousel-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
  padding-bottom: 40px;
}

.nav-btn {
  background: black;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.nav-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.page-indicator {
  font-weight: 600;
  color: #666;
  z-index: 1;
}

/* Empty/Loading States */
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  margin: 40px auto;
  max-width: 400px;
  position: relative;
  z-index: 1;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #eee;
  border-top-color: #f8e503;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn, .create-btn {
  background: #f8e503;
  color: black;
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
