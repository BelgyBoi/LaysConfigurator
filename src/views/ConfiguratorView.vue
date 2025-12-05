<script setup>
import { reactive } from 'vue'
import BagPreview from '@/components/BagPreview.vue'

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
  <div>
    <h1>Configurator</h1>

    <BagPreview />

    <form>
      <div>
        <label>Bag name</label>
        <input type="text" v-model="bag.name" />
      </div>

      <div>
        <label>Bag color</label>
        <input type="color" v-model="bag.bagColor" />
        <input type="text" v-model="bag.bagColor" placeholder="#ffffff or rgb(...)" />
      </div>

      <div>
        <label>Font</label>
        <select v-model="bag.font">
          <option value="">Select font</option>
          <option value="serif">Serif</option>
          <option value="sans">Sans</option>
          <option value="script">Script</option>
        </select>
      </div>

      <div>
        <label>Pattern</label>
        <select v-model="bag.pattern">
          <option value="">Select pattern</option>
          <option value="stripes">Stripes</option>
          <option value="dots">Dots</option>
          <option value="waves">Waves</option>
        </select>
      </div>

      <div>
        <label>Packaging</label>
        <select v-model="bag.packaging">
          <option value="">Select packaging</option>
          <option value="matte">Matte</option>
          <option value="glossy">Glossy</option>
          <option value="recyclable">Recyclable</option>
        </select>
      </div>

      <div>
        <label>Inspiration</label>
        <textarea v-model="bag.inspiration"></textarea>
      </div>

      <div>
        <label>Key flavours (comma separated)</label>
        <input type="text" v-model="bag.keyFlavoursText" />
      </div>

      <div>
        <label>Image</label>
        <input type="text" v-model="bag.image" />
      </div>

      <button type="button" @click="handleSubmit">Save bag</button>
    </form>
  </div>
</template>

<style></style>
