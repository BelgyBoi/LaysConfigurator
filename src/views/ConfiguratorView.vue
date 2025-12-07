<script setup>
import { reactive } from 'vue'
import BagPreview from '@/components/BagPreview.vue'
import { Chrome } from '@ckpack/vue-color'

const bag = reactive({
  name: '',
  image: '',
  bagColor: '#ffffff',
  font: '',
  pattern: '',
  packaging: '',
  inspiration: '',
  keyFlavoursText: '',
  keyFlavours: [],
})

function handleSubmit() {
  bag.keyFlavours = bag.keyFlavoursText
    .split(',')
    .map((flavour) => flavour.trim())
    .filter(Boolean)
  console.log('bag payload', bag)
}
</script>

<template>
  <div class="configurator">
    <header class="configurator__header">
      <p class="eyebrow">Lays configurator</p>
    </header>

    <div class="configurator__layout">
      <div class="preview-panel">
        <BagPreview />
      </div>

      <form class="config-form">
        <div class="field">
          <label>Bag name</label>
          <input type="text" v-model="bag.name" />
        </div>

        <div class="field dual">
          <label>Bag color</label>
          <div class="dual__inputs">
            <Chrome v-model="bag.bagColor" />
            <input
              type="text"
              v-model="bag.bagColor"
              placeholder="#ffffff or rgb(...)"
            />
          </div>
        </div>

        <div class="field">
          <label>Font</label>
          <select v-model="bag.font">
            <option value="">Select font</option>
            <option value="serif">Serif</option>
            <option value="sans">Sans</option>
            <option value="script">Script</option>
          </select>
        </div>

        <div class="field">
          <label>Pattern</label>
          <select v-model="bag.pattern">
            <option value="">Select pattern</option>
            <option value="stripes">Stripes</option>
            <option value="dots">Dots</option>
            <option value="waves">Waves</option>
          </select>
        </div>

        <div class="field">
          <label>Packaging</label>
          <select v-model="bag.packaging">
            <option value="">Select packaging</option>
            <option value="matte">Matte</option>
            <option value="glossy">Glossy</option>
            <option value="recyclable">Recyclable</option>
          </select>
        </div>

        <div class="field">
          <label>Inspiration</label>
          <textarea v-model="bag.inspiration" rows="3"></textarea>
        </div>

        <div class="field">
          <label>Key flavours (comma separated)</label>
          <input type="text" v-model="bag.keyFlavoursText" />
        </div>

        <div class="field">
          <label>Image</label>
          <input type="text" v-model="bag.image" />
        </div>

        <button class="primary" type="button" @click="handleSubmit">Save bag</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.configurator {
  padding: 16px 24px 24px;
  color: #1f1f1f;
}

.configurator__header {
  margin-bottom: 18px;
}

.eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 12px;
  margin: 0 0 4px;
  color: #8a8f98;
}

.configurator h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}

.configurator__layout {
  display: flex;
  align-items: flex-start;
  gap: 28px;
}

.preview-panel {
  flex: 1 1 40%;
  display: flex;
  justify-content: flex-start;
  padding-left: 8px;
}

.config-form {
  flex: 1 1 60%;
  background: #f7f8fa;
  border: 1px solid #e2e6eb;
  border-radius: 12px;
  padding: 18px;
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 6px;
}

.field label {
  font-size: 13px;
  color: #4a4f58;
}

.config-form input,
.config-form select,
.config-form textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d6dbe2;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  background: #fff;
}

.dual__inputs {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 1fr;
  gap: 12px;
  align-items: start;
}

.dual__inputs :deep(.vc-chrome) {
  width: 100%;
  border: 1px solid #d6dbe2;
  border-radius: 10px;
  box-shadow: none;
}

.primary {
  justify-self: start;
  padding: 10px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ffcc00, #ff9b00);
  color: #1f1f1f;
  border: 1px solid #e3a100;
  font-weight: 700;
  cursor: pointer;
}

.primary:hover {
  filter: brightness(1.05);
}

@media (max-width: 900px) {
  .configurator__layout {
    flex-direction: column;
  }

  .preview-panel {
    width: 100%;
  }

  .dual__inputs {
    grid-template-columns: 1fr;
  }
}
</style>
