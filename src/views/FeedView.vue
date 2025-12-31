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
    if (bag.hasVoted) {
      // "Unvote" - Visual only since API doesn't support untoggle
      bag.votes = Math.max(0, (bag.votes || 0) - 1);
      bag.hasVoted = false;
      return;
    }

    // Vote
    bag.votes = (bag.votes || 0) + 1;
    bag.hasVoted = true;

    await voteForBag(bag._id);
  } catch (err) {
    // If error is "Bad Request" (400), it likely means user already voted.
    // We treat this as a success for the UI state so they can toggle it back on.
    const isAlreadyVotedError = err.message.includes("Bad Request") || err.message.includes("400");

    if (isAlreadyVotedError) {
      // Do not revert. Ensure state is consistent.
      bag.hasVoted = true;
      // Optionally sync vote count if needed, but keeping optimistic +1 is fine
    } else {
      // Revert on real failures
      if (bag.hasVoted) {
        bag.votes = Math.max(0, (bag.votes || 0) - 1);
        bag.hasVoted = false;
      }
      alert("Could not register vote: " + err.message);
    }
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
              <button
                @click="handleVote(bag)"
                class="vote-btn-wrapper"
                :class="{ 'voted': bag.hasVoted }"
                title="Vote for this flavor"
              >
                <div class="vote-icon-container">
                  <img src="/assets/logo-lays.png" alt="Vote" />
                </div>
                <span class="vote-label">{{ bag.hasVoted ? 'Voted!' : 'Vote' }}</span>
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2.5rem;
}

/* Bag Card Layout */
.bag-card {
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
  border: none;
  display: flex;
  flex-direction: column;
}

.bag-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
  height: 320px; /* Taller, more prominent */
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  overflow: hidden;
  margin: 0; /* Full width */
  border-bottom: 1px solid #eee;
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

/* Vote Button Redesign */
.vote-btn-wrapper {
  background: none;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 50px;
  transition: background-color 0.2s;
}

.vote-btn-wrapper:hover {
  background-color: #f9f9f9;
}

.vote-icon-container {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.vote-icon-container img {
  width: 100%;
  height: auto;
  filter: grayscale(100%);
  opacity: 0.5;
  transition: all 0.3s ease;
}

.vote-btn-wrapper:hover .vote-icon-container {
  transform: scale(1.1);
}

.vote-btn-wrapper:hover .vote-icon-container img {
  opacity: 0.8;
}

.vote-label {
  font-size: 1rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #9ca3af; /* Gray initially */
  transition: color 0.3s ease;
  letter-spacing: 0.05em;
}

/* Active State */
.vote-btn-wrapper.voted .vote-icon-container {
  transform: scale(1.1);
}

.vote-btn-wrapper.voted .vote-icon-container img {
  filter: grayscale(0%);
  opacity: 1;
  filter: drop-shadow(0 0 8px rgba(255, 212, 0, 0.6));
  animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.vote-btn-wrapper.voted .vote-label {
  color: #ec2e2e; /* Lays Red */
}

@keyframes pop {
  0% { transform: scale(0.8); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
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
