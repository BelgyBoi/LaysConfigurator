<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Chrome } from '@ckpack/vue-color'
import BagPreview from '@/components/BagPreview.vue'
import { createBag } from '@/services/bagService'

const router = useRouter()
const isSaving = ref(false)

const bag = reactive({
  name: '',
  imageName: '',
  imageData: '',
  imageFile: null,
  bagColor: '#a0a3a6',
  font: '',
  pattern: '',
  packaging: 'matte',
  inspiration: '',
  keyFlavoursText: '',
  keyFlavours: [],
})

const presetColors = [
  "#f8e503", "#ec2e2e", "#f79324", "#0dab4e", "#05a8df", "#f2a007", "#4b5563", "#7f52ff"
]

const isColorPickerOpen = ref(false)
const tempColor = ref(bag.bagColor)
const imageInputRef = ref(null)
const bagPreviewRef = ref(null)

async function handleSubmit() {
  if (!bag.name) {
    alert("Please give your flavor a name!")
    return
  }

  isSaving.value = true

  try {
    bag.keyFlavours = bag.keyFlavoursText
      .split(',')
      .map((flavour) => flavour.trim())
      .filter(Boolean)

    // Capture the 3D snapshot from the preview component
    let snapshotImage = null
    if (bagPreviewRef.value) {
      // Capture at high res first, then downscale
      const rawSnapshot = bagPreviewRef.value.captureSnapshot(0.9, 'image/jpeg')
      if (rawSnapshot) {
        snapshotImage = await resizeDataURL(rawSnapshot, 800, 0.8)
      }
    }

    // Prepare payload for API
    // We send the 3D snapshot as the main image so the Feed looks correct.
    const payload = {
      name: bag.name,
      bagColor: bag.bagColor,
      font: bag.font || 'sans',
      pattern: bag.pattern,
      packaging: bag.packaging,
      inspiration: bag.inspiration,
      keyFlavours: bag.keyFlavours,
      image: snapshotImage || bag.imageData || null
    }

    await createBag(payload)

    // Redirect to feed on success
    router.push('/feed')
  } catch (error) {
    alert("Failed to save bag: " + error.message)
  } finally {
    isSaving.value = false
  }
}

function toHexString(value) {
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object' && 'hex' in value) {
    const hex = value.hex
    if (typeof hex === 'string') {
      return hex.startsWith('#') ? hex : `#${hex}`
    }
  }
  return '#ffffff'
}

function confirmColor() {
  const hex = toHexString(tempColor.value)
  bag.bagColor = hex || '#ffffff'
  tempColor.value = bag.bagColor
  isColorPickerOpen.value = false
}

function cancelColor() {
  tempColor.value = bag.bagColor || '#ffffff'
  isColorPickerOpen.value = false
}

function openImagePicker() {
  imageInputRef.value?.click()
}

function handleImageChange(event) {
  const [file] = event?.target?.files || []
  if (!file) return
  if (!file.type.startsWith('image/')) {
    console.warn('Selected file is not an image')
    return
  }

  // Resize and compress image
  resizeImage(file, 800, 0.8)
    .then((resizedDataUrl) => {
      bag.imageFile = file // Keep original file ref if needed, but data is what matters
      bag.imageName = file.name
      bag.imageData = resizedDataUrl
    })
    .catch((err) => {
      console.error("Image resize error:", err)
      alert("Failed to process image")
    })
}

function resizeDataURL(dataUrl, maxWidth, quality, outputType = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width
          width = maxWidth
        }
      } else {
        if (height > maxWidth) {
          width *= maxWidth / height
          height = maxWidth
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      // Ensure canvas is clear for transparency
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL(outputType, quality))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

function resizeImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      resizeDataURL(e.target.result, maxWidth, quality, type)
        .then(resolve)
        .catch(reject)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function clearImage() {
  bag.imageFile = null
  bag.imageName = ''
  bag.imageData = ''
  if (imageInputRef.value) {
    imageInputRef.value.value = ''
  }
}
</script>

<template>
  <div class="configurator">
    <!-- <header class="configurator__header">
      <p class="eyebrow">Lays configurator</p>
    </header> -->

    <div class="configurator__layout">
      <div class="preview-panel">
        <BagPreview
          ref="bagPreviewRef"
          :color="bag.bagColor"
          :pattern="bag.pattern"
          :packaging="bag.packaging"
          :image="bag.imageData"
          :name="bag.name"
          :font="bag.font"
        />
      </div>

      <form class="config-form">
        <div class="field">
          <label>Bag name</label>
          <input type="text" v-model="bag.name" />
        </div>

        <div class="field">
          <label>Bag color</label>
          <div class="swatches">
            <button
              v-for="c in presetColors"
              :key="c"
              type="button"
              :style="{ background: c }"
              :class="['swatch', { active: bag.bagColor === c }]"
              @click="bag.bagColor = c"
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
          <div class="upload-row">
            <button class="button" type="button" @click="openImagePicker">Upload image</button>
            <span class="file-label" v-if="bag.imageName">{{ bag.imageName }}</span>
            <span class="file-label muted" v-else>No image selected</span>
            <button
              v-if="bag.imageName"
              class="button button--ghost"
              type="button"
              @click="clearImage"
            >
              Remove
            </button>
          </div>
          <input
            ref="imageInputRef"
            type="file"
            accept="image/*"
            class="hidden-file"
            @change="handleImageChange"
          />
        </div>

        <button class="primary" type="button" @click="handleSubmit">Save bag</button>
      </form>
    </div>

    <div
      v-if="isColorPickerOpen"
      class="color-overlay"
      @click="cancelColor"
    >
      <div class="color-modal" @click.stop>
        <div class="color-modal__header">
          <p class="color-modal__title">Select bag color</p>
        </div>
        <Chrome v-model="tempColor" />
        <div class="color-actions">
          <button class="button" type="button" @click="cancelColor">Cancel</button>
          <button class="button button--confirm" type="button" @click="confirmColor">
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.configurator {
  padding: 0;
  color: #1f1f1f;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
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
  width: 100%;
  height: 100%;
}

.preview-panel {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  padding: 0;
}

.config-form {
  position: fixed;
  right: 60px;
  top: calc(var(--nav-height) + 60px);
  flex: 1 1 60%;
  background: #f7f8fa;
  border: 1px solid #e2e6eb;
  border-radius: 12px;
  padding: 18px 25px;
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

.color-bar {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  border: 1px solid #d6dbe2;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.color-bar:focus,
.color-bar:focus-visible,
.color-bar:hover {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 204, 0, 0.25);
  transform: translateY(-1px);
}

.color-bar__swatch {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #d6dbe2;
}

.color-bar__value {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #1f1f1f;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.file-label {
  font-size: 13px;
  color: #1f1f1f;
}

.file-label.muted {
  color: #8a8f98;
}

.hidden-file {
  display: none;
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

.color-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 10;
}

.color-modal {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e6eb;
  padding: 16px;
  width: min(520px, 100%);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
}

.color-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.color-modal__title {
  margin: 0;
  font-weight: 700;
  color: #1f1f1f;
}

.color-modal :deep(.vc-chrome) {
  width: 100%;
  border: 1px solid #d6dbe2;
  border-radius: 10px;
  box-shadow: none;
}

.color-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.button {
  border: 1px solid #d6dbe2;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 600;
}

.button:hover {
  background: #eef1f5;
}

.button--ghost {
  background: transparent;
}

.button--confirm {
  border: 1px solid #e3a100;
  background: linear-gradient(135deg, #ffcc00, #ff9b00);
  color: #1f1f1f;
}

.button--confirm:hover {
  filter: brightness(1.05);
}

@media (max-width: 900px) {
  .configurator__layout {
    flex-direction: column;
  }

  .preview-panel {
    width: 100%;
  }
}
</style>
