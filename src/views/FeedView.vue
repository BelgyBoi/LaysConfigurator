<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { getAllBags, voteForBag, unvoteBag, getUserVotes } from '../services/bagService';
import BagPreview from '@/components/BagPreview.vue';

const bags = ref([]);
const isLoading = ref(true);
const error = ref(null);
let pollingInterval = null;

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

function processBagsData(bagsData, userVotes) {
    const votesSet = new Set(userVotes);

    return Array.isArray(bagsData)
      ? bagsData.map(bag => {
          // Construct creator name
          let creatorName = 'Lays Fan';
          if (bag.user && bag.user.firstName) {
              creatorName = `${bag.user.firstName} ${bag.user.lastName || ''}`.trim();
          } else if (bag.creator) {
              creatorName = bag.creator;
          }

          return {
            ...bag,
            creatorName, // Add formatted name
            hasVoted: votesSet.has(bag._id),
            // Map API's voteCount to local 'votes' property
            votes: bag.voteCount !== undefined ? bag.voteCount : (bag.votes || 0)
          };
        }).sort((a, b) => (b.votes || 0) - (a.votes || 0))
      : [];
}

async function fetchBags(isBackground = false) {
  if (!isBackground) {
      isLoading.value = true;
      error.value = null;
  }

  try {
    // Fetch bags and user votes in parallel
    const [bagsData, userVotes] = await Promise.all([
      getAllBags(),
      getUserVotes()
    ]);

    const newBags = processBagsData(bagsData, userVotes);

    if (isBackground) {
        // Smart Update: Only update if data changed to avoid UI jitter/re-renders
        // We strip out 'isVoting' temporary state before comparison to avoid race conditions
        const cleanCurrent = bags.value.map(bag => {
            const b = { ...bag };
            delete b.isVoting;
            return b;
        });
        const cleanNew = newBags.map(bag => {
             const b = { ...bag };
             delete b.isVoting;
             return b;
        });

        // Simple JSON comparison serves as a deep equals for this data structure
        if (JSON.stringify(cleanCurrent) !== JSON.stringify(cleanNew)) {
             bags.value = newBags;
        }
    } else {
        bags.value = newBags;
    }

  } catch (err) {
    if (!isBackground) {
        error.value = "Failed to load the feed. Please try again.";
        console.error(err);
    } else {
        console.warn("Background poll failed", err);
    }
  } finally {
    if (!isBackground) {
        isLoading.value = false;
    }
  }
}

async function handleVote(bag) {
  if (bag.isVoting) return;
  bag.isVoting = true;

  // Store previous state for rollback
  const previousHasVoted = bag.hasVoted;
  const previousVotes = Number(bag.votes) || 0;

  // Optimistic Update
  if (previousHasVoted) {
      bag.hasVoted = false;
      bag.votes = Math.max(0, previousVotes - 1);
  } else {
      bag.hasVoted = true;
      bag.votes = previousVotes + 1;
  }

  try {
    let updatedBag;
    if (previousHasVoted) {
        updatedBag = await unvoteBag(bag._id);
    } else {
        updatedBag = await voteForBag(bag._id);
    }

    if (updatedBag) {
        if (typeof updatedBag.voteCount === 'number') {
             bag.votes = updatedBag.voteCount;
        } else if (typeof updatedBag.votes === 'number') {
            bag.votes = updatedBag.votes;
        }
        if (typeof updatedBag.hasVoted === 'boolean') {
            bag.hasVoted = updatedBag.hasVoted;
        }
    }

    // Refresh list to ensure correct sorting
    fetchBags(true);

  } catch (e) {
    console.error("Vote failed", e);

    if (!previousHasVoted && e.message && (e.message.includes('400') || e.message.includes('limit'))) {
        alert("You might have reached your voting limit, or you already voted for this!");
    }

    // Revert logic
    bag.hasVoted = previousHasVoted;
    bag.votes = previousVotes;
  } finally {
    bag.isVoting = false;
  }
}

onMounted(() => {
  fetchBags();

  pollingInterval = setInterval(() => {
    fetchBags(true);
  }, 3000); // Poll every 3 seconds
});

onUnmounted(() => {
    if (pollingInterval) clearInterval(pollingInterval);
});
</script>

<template>
  <div class="feed-container">
    <div class="light-effect"></div>

    <div class="content-wrapper">

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Frying up the feed...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>⚠️ {{ error }}</p>
        <button @click="fetchBags" class="retry-btn">Try Again</button>
      </div>

      <div v-else class="carousel-container">
         <button class="nav-btn prev" @click="prevPage" :disabled="!hasPrev" aria-label="Previous Page">
            &larr;
         </button>

         <div class="shelf-grid">
            <div
              v-for="bag in visibleBags"
              :key="bag._id"
              class="shelf-item"
            >
                <!-- 1. Name of the bag at the top -->
                <div class="card-top-section">
                   <h3 class="bag-title">{{ bag.name }}</h3>
                </div>

                <!-- 2. Bag Preview -->
                <div class="shelf-bag-preview">
                   <BagPreview
                       :color="bag.bagColor"
                       :pattern="bag.pattern"
                       :packaging="bag.packaging"
                       :name="bag.name"
                       :font="bag.font"
                       :image="(bag.snapshot && bag.image === bag.snapshot) ? '' : bag.image"
                       :read-only="true"
                       :auto-rotate="false"
                       :show-background="false"
                       content-mode="shelf"
                   />
                </div>

                <div class="shelf-info">
                   <div class="info-block">
                     <!-- 3. Creator Name (No Header, just name) -->
                     <h4 class="creator-name">{{ bag.creatorName }}</h4>
                   </div>

                   <!-- 4. Key Flavours (Pills with scrollbar) -->
                   <div class="info-block" v-if="bag.keyFlavours && bag.keyFlavours.length">
                     <div class="flavor-pills-container">
                         <span
                             class="flavor-pill"
                             v-for="(flavor, idx) in (Array.isArray(bag.keyFlavours) ? bag.keyFlavours : [])"
                             :key="idx"
                         >
                             {{ flavor }}
                         </span>
                         <span v-if="!Array.isArray(bag.keyFlavours)" class="flavor-pill">
                             {{ bag.keyFlavours }}
                         </span>
                     </div>
                   </div>

                   <!-- 5. Inspiration (Header + Box) -->
                   <div class="inspiration-box" v-if="bag.inspiration">
                       <span class="box-header">INSPIRATION</span>
                       <div class="inspiration-content">{{ bag.inspiration }}</div>
                   </div>
                </div>

                <!-- 6. Vote Button -->
                <div class="card-footer">
                   <button
                     class="vote-action-btn"
                     :class="{ voted: bag.hasVoted }"
                     @click.stop="handleVote(bag)"
                   >
                      <span class="icon">{{ bag.hasVoted ? '❤️' : '🤍' }}</span>
                      <span class="text">{{ bag.hasVoted ? 'VOTED' : 'VOTE THIS' }}</span>
                      <span class="count">{{ bag.votes || 0 }}</span>
                   </button>
                </div>
            </div>
         </div>

         <button class="nav-btn next" @click="nextPage" :disabled="!hasNext" aria-label="Next Page">
            &rarr;
         </button>

         <!-- Page Indicator moved to bottom context -->
         <div class="carousel-footer">
            <span class="page-indicator">Page {{ currentPage + 1 }}</span>
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
  background: #fdfcee; /* Creamy "Lay's Potato" background */
  background-image:
    radial-gradient(#e6e1d3 1px, transparent 1px),
    radial-gradient(#e6e1d3 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
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
  margin-bottom: 3rem;
  padding: 0 1rem;
}

.feed-header h1 {
  font-family: 'Pacifico', cursive;
  font-size: 3.5rem;
  color: #bf202f; /* Darker Lay's Red */
  text-shadow: 3px 3px 0px #fff;
  margin: 0 0 0.5rem 0;
  transform: rotate(-2deg);
}

.subtitle {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1f1f1f;
  margin: 0;
  opacity: 0.8;
}

/* Shelf Grid */
.carousel-container {
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  padding: 0 60px;
}

.shelf-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  min-height: 500px;
}

/* Responsive adjustment */
@media (max-width: 1100px) {
  .shelf-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .shelf-grid {
    grid-template-columns: 1fr;
  }
}

.shelf-item {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05); /* Soft card shadow */
  transition: transform 0.3s;
  height: 100%; /* Fill grid cell */
  padding-bottom: .5rem; /* Padding for bottom button */
  overflow: hidden;
}

.shelf-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

.shelf-bag-preview {
  width: 100%;
  aspect-ratio: 1;
  background: repeating-conic-gradient(
      from 0deg,
      #f8e503 0deg 10deg,
      #ffdd00 10deg 20deg
    );
  border-radius: 0;
  position: relative;
  overflow: hidden;
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

/* Shelf Info Styling - Flexible & Consistent */
.shelf-info {
  flex: 1; /* Pushes footer down */
  display: flex;
  flex-direction: column;
  gap: .5rem;
  padding: 1rem;
  text-align: left;
}

.info-block {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

.info-header {
  font-size: 0.7rem;
  font-weight: 800;
  color: #999;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.bag-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Flavor Pills */
.flavor-pills-container {
    display: flex;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px; /* Space for scrollbar */
    scrollbar-width: thin; /* Firefox */
    height: 48px; /* Fixed height to prevent shift */
    align-items: center; /* Center vertically if space permits, or flex-start? If center, scrollbar might cover. Let's try center but with sufficient height */
    /* Actually flex-start is safer to keep them top-aligned */
    align-items: flex-start;
    padding-top: 4px; /* Center visual */
}
/* Custom Scrollbar for pills */
.flavor-pills-container::-webkit-scrollbar {
    height: 6px;
}
.flavor-pills-container::-webkit-scrollbar-track {
   background: #f0f0f0;
   border-radius: 3px;
}
.flavor-pills-container::-webkit-scrollbar-thumb {
   background: #d1d1d1;
   border-radius: 3px;
}
.flavor-pills-container::-webkit-scrollbar-thumb:hover {
   background: #bbb;
}

.flavor-pill {
    background: #fff7cc; /* Very light yellow */
    color: #8a6d00;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
    white-space: nowrap;
    border: 1px solid #faeab1;
}

.creator-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.chef-block {
    margin-bottom: auto; /* Push anything below it further down if needed */
}

/* Card Footer with Button */
.card-footer {
    padding: 0 1rem 1rem;
    margin-top: auto;
}

/* Vote Action Button */
.vote-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: white;
  border: 2px solid #eee;
  padding: 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 10px rgba(0,0,0,0.03);
}

.vote-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  border-color: #bf202f;
}

.vote-action-btn .icon {
  font-size: 1.2rem;
}

.vote-action-btn .text {
  font-weight: 800;
  font-size: 1rem;
  color: #333;
  letter-spacing: 0.02em;
}

.vote-action-btn .count {
  font-weight: 600;
  color: #aaa;
  font-size: 0.9rem;
  margin-left: auto;
}

/* Voted State */
.vote-action-btn.voted {
  background: #bf202f;
  border-color: #a01b27;
}

.vote-action-btn.voted .text,
.vote-action-btn.voted .count {
  color: white;
}

/* Nav Buttons */
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  height: 60px;
  background: white;
  color: #bf202f;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(191, 32, 47, 0.2);
  z-index: 10;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: #bf202f;
  color: white;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 15px 40px rgba(191, 32, 47, 0.3);
}

.nav-btn.prev {
  left: 0;
}

.nav-btn.next {
  right: 0;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #f1f1f1;
  color: #aaa;
  box-shadow: none;
}

.carousel-footer {
  text-align: center;
  margin-top: 20px;
}

.page-indicator {
  font-weight: 700;
  color: #bf202f;
  background: white;
  padding: 6px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  font-size: 0.9rem;
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

.inspiration-box {
  background: #f8f9fa;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  /* Fixed height + no auto margin */
  height: 150px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.box-header {
  font-size: 0.7rem;
  font-weight: 800;
  color: #aaa;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.inspiration-content {
  font-size: 0.9rem;
  color: #444;
  line-height: 1.4;
  flex: 1; /* Fill the box */
  overflow-y: auto;
  white-space: pre-wrap;
  padding-right: 4px;
}

.inspiration-content::-webkit-scrollbar {
  width: 4px;
}
.inspiration-content::-webkit-scrollbar-track {
  background: transparent;
}
.inspiration-content::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;
}
.inspiration-content::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}

/* Card Top Section (New) */
.card-top-section {
    padding: 16px 20px;
    background: white;
}

</style>
