<script setup>
import { ref, onMounted } from 'vue';
import { getAllBags, voteForBag } from '../services/bagService';

const bags = ref([]);
const isLoading = ref(true);
const error = ref('');

const fetchBags = async () => {
  try {
    isLoading.value = true;
    const data = await getAllBags();
    // Ensure we have an array
    bags.value = Array.isArray(data) ? data : (data.lays || []);
  } catch (err) {
    error.value = "Failed to load the flavor feed. " + err.message;
  } finally {
    isLoading.value = false;
  }
};

const handleVote = async (bag) => {
  try {
    // Optimistic update
    bag.votes = (bag.votes || 0) + 1;

    await voteForBag(bag._id);
    // Ideally we'd update with the server response, but optimistic is snappier
  } catch (err) {
    // Revert on failure
    bag.votes = Math.max(0, (bag.votes || 0) - 1);
    alert("Could not register vote: " + err.message);
  }
};

const getBagColor = (colorName) => {
  // Map common colors to CSS variables or hex
  const map = {
    'red': '#ec2e2e',
    'blue': '#05a8df',
    'green': '#0dab4e',
    'orange': '#f79324',
    'yellow': '#f8e503'
  };
  return map[colorName?.toLowerCase()] || '#f8e503'; // Default to yellow
};

onMounted(() => {
  fetchBags();
});
</script>

<template>
  <div class="feed-container">
    <div class="light-effect"></div>

    <div class="content-wrapper">
      <header class="feed-header">
        <h1>Flavor Battle</h1>
        <p>Vote for the next big Lays sensation!</p>
      </header>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div> <!-- Custom chip spinner? -->
        <p>Frying up the feed...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>⚠️ {{ error }}</p>
        <button @click="fetchBags" class="retry-btn">Try Again</button>
      </div>

      <div v-else class="bags-grid">
        <div
          v-for="bag in bags"
          :key="bag._id"
          class="bag-card"
        >
          <div class="bag-preview" :style="{ backgroundColor: getBagColor(bag.dominantColor) }">
            <div class="bag-logo">
              <img src="/assets/logo-lays.png" alt="Lays" />
            </div>
            <div class="bag-flavor-name">{{ bag.name || 'Mystery Flavor' }}</div>
            <div class="bag-chip-decor"></div>
          </div>

          <div class="bag-info">
            <h3>{{ bag.name || 'Unnamed' }}</h3>
            <p class="creator">by {{ bag.creator || 'Anonymous' }}</p>

            <div class="vote-action">
              <span class="vote-count">
                <span class="count">{{ bag.votes || 0 }}</span> votes
              </span>
              <button @click="handleVote(bag)" class="vote-btn">
                Vote
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State if no bags -->
      <div v-if="!isLoading && !error && bags.length === 0" class="empty-state">
        <p>No flavors yet! Be the first to create one.</p>
        <router-link to="/" class="create-btn">Create Flavor</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Main Layout similar to Auth */
.feed-container {
  min-height: 100vh;
  width: 100%;
  background-color: #f8e503;
  background-image: repeating-conic-gradient(
    from 0deg,
    #f8e503 0deg 15deg,
    #ffd400 15deg 30deg
  );
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 4rem;
}

.light-effect {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  background: radial-gradient(circle at 50% 10%, rgba(255, 255, 255, 0.4) 0%, transparent 60%);
  animation: pulse-light 5s ease-in-out infinite alternate;
}

@keyframes pulse-light {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.1); opacity: 0.8; }
}

.content-wrapper {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.feed-header {
  text-align: center;
  margin-bottom: 3rem;
  color: #424244;
}

.feed-header h1 {
  font-size: 3.5rem;
  font-weight: 800;
  margin: 0;
  text-shadow: 2px 2px 0px rgba(255,255,255,0.5);
}

.feed-header p {
  font-size: 1.2rem;
  font-weight: 600;
  opacity: 0.8;
}

/* Grid */
.bags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

/* Bag Card Layout */
.bag-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 4px solid white;
  display: flex;
  flex-direction: column;
}

.bag-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.2);
}

/* 1. Brand Logo */
.card-brand {
  text-align: center;
  padding-top: 1.5rem;
}

.card-brand img {
  width: 60px;
  height: auto;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

/* 2. Text Header */
.bag-header {
  padding: 0.5rem 1.2rem 1rem;
  text-align: center; /* Center the text to match logo */
}

.bag-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-color);
  line-height: 1.2;
}

.creator {
  color: #888;
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 0.3rem;
  margin-bottom: 0;
}

/* 3. Preview Area (The Image Stack) */
.bag-preview {
  height: 150px; /* Reduced height to force a landscape 'box' aspect ratio */
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  overflow: hidden;
  margin: 0 1.2rem; /* Indent side margins to frame it inside the card */
  border-radius: 12px; /* Rounded corners for the "box" look */
  border: 1px solid #ddd;
}

.bag-real-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 15px;
  transition: transform 0.5s ease;
}

.bag-card:hover .bag-real-image {
  transform: scale(1.1);
}

/* CSS Fallback (Just the color/decor) */
.css-bag-only {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Subtle gradient to show it's a "surface" */
  background-image: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(0,0,0,0.05) 100%);
}

.bag-chip-decor {
  /* Simple potato chip shape/decor if no image */
  width: 60px;
  height: 60px;
  background-color: rgba(255,255,255,0.3);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
}

/* 3. Footer */
.bag-footer {
  padding: 1rem 1.2rem 1.5rem;
  background: white;
}

.vote-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vote-count {
  font-weight: 700;
  color: var(--blue);
}

.vote-count .count {
  font-size: 1.2rem;
}

.vote-btn {
  background: var(--red);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 800;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 10px rgba(236, 46, 46, 0.3);
}

.vote-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 15px rgba(236, 46, 46, 0.4);
}

.vote-btn:active {
  transform: scale(0.95);
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
