<script setup>
import { ref, onMounted } from 'vue'
import { getMyBags } from '@/services/bagService'

const emit = defineEmits(['close', 'select'])
const bags = ref([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    const data = await getMyBags()
    bags.value = data
  } catch (e) {
    console.error("Failed to load my bags", e)
  } finally {
    isLoading.value = false
  }
})

function selectBag(bag) {
  emit('select', bag)
}
</script>

<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h2>My Bags</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </header>

      <div class="modal-body">
        <div v-if="isLoading" class="loading">Loading...</div>
        <div v-else-if="bags.length === 0" class="empty">
          <p>You haven't created any bags yet.</p>
        </div>
        <div v-else class="bag-list">
          <div
            v-for="bag in bags"
            :key="bag._id"
            class="bag-item"
            @click="selectBag(bag)"
          >
            <div class="bag-thumb">
              <img v-if="bag.image" :src="bag.image" alt="Bag" />
              <div v-else class="placeholder-thumb">🍟</div>
            </div>
            <div class="bag-info">
              <h3>{{ bag.name }}</h3>
              <p>{{ bag.packaging }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.modal-body {
  overflow-y: auto;
  padding: 20px;
  flex: 1;
}

.bag-list {
  display: grid;
  gap: 12px;
}

.bag-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.bag-item:hover {
  background: #f9f9f9;
}

.bag-thumb {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
  background: #f0f0f0;
  flex-shrink: 0;
}

.bag-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 24px;
}

.bag-info h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.bag-info p {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.loading, .empty {
  text-align: center;
  padding: 20px;
  color: #666;
}
</style>
