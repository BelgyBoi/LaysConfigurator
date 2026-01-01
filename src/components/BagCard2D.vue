<script setup>
import { computed } from 'vue'

const props = defineProps({
  bag: {
    type: Object,
    required: true
  }
})

// Compute styles based on bag properties
const bagStyle = computed(() => {
  return {
    backgroundColor: props.bag.bagColor || '#a0a3a6',
  }
})

// Pattern overlay classes
const patternClass = computed(() => {
  return props.bag.pattern ? `pattern-${props.bag.pattern}` : ''
})

// Determine packaging finish
const finishClass = computed(() => {
  return props.bag.packaging === 'glossy' ? 'finish-glossy' : 'finish-matte'
})

const fontClass = computed(() => {
  return props.bag.font ? `font-${props.bag.font}` : 'font-sans'
})
</script>

<template>
  <div class="bag-card-2d" :class="[finishClass]">
    <!-- Bag Shape / Base Color -->
    <div class="bag-shape" :style="bagStyle">
      <!-- Pattern Layer -->
      <div class="pattern-layer" :class="patternClass"></div>

      <!-- Shading/Lighting Overlay (The "Model" look) -->
      <div class="shading-overlay"></div>

      <!-- Content Layer -->
      <div class="content-layer" :class="fontClass">
        <div class="logo-area">
           <!-- Ideally use the SVG logo -->
           <img src="@/assets/logo.svg" alt="Lays" class="logo-img" />
        </div>

        <div class="flavor-text">
          {{ bag.name || 'Flavor Name' }}
        </div>

        <div class="ribbon" v-if="bag.keyFlavours && bag.keyFlavours.length">
             <span>{{ bag.keyFlavours[0] }}</span>
        </div>

        <div class="bottom-text">
           {{ bag.inspiration ? 'Limited Edition' : 'Classic' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bag-card-2d {
  width: 100%;
  aspect-ratio: 0.75; /* Classic bag ratio */
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
}

.bag-shape {
  width: 85%;
  height: 95%;
  position: relative;
  border-radius: 10px;
  clip-path: path("M 10 5 Q 50 0 90 5 L 95 15 L 100 90 Q 50 100 0 90 L 5 15 L 10 5 Z"); /* Simple Bag Shape Approximation */
  /* Better clip-path for a chips bag */
  clip-path: polygon(
    5% 0%, 95% 0%,
    100% 10%, 98% 90%,
    95% 100%, 5% 100%,
    2% 90%, 0% 10%
  );
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
}

.bag-card-2d:hover .bag-shape {
  transform: scale(1.02);
}

/* Patterns */
.pattern-layer {
  position: absolute;
  inset: 0;
  opacity: 0.15;
  pointer-events: none;
}

.pattern-stripes {
  background-image: linear-gradient(0deg, transparent 50%, #000 50%);
  background-size: 20px 20px;
}

.pattern-dots {
  background-image: radial-gradient(#000 20%, transparent 20%);
  background-size: 20px 20px;
}

.pattern-waves {
  background: repeating-radial-gradient(circle at 0 0, transparent 0, #000 10px, transparent 20px);
}

/* Shading */
.shading-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.4) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.3) 100%),
    linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 10%, transparent 90%, rgba(0,0,0,0.4) 100%);
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 2;
}

.finish-glossy .shading-overlay {
  background:
    linear-gradient(120deg, rgba(255,255,255,0.8) 0%, transparent 30%, transparent 100%);
  opacity: 0.8;
}

.finish-matte .shading-overlay {
  opacity: 0.4;
}

/* Content */
.content-layer {
  position: relative;
  z-index: 3;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.logo-area {
  margin-bottom: 10px;
}

.logo-img {
  width: 80px;
  height: auto;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.flavor-text {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.1;
  max-width: 90%;
  word-wrap: break-word;
  text-transform: uppercase;
}

/* Fonts */
.font-serif { font-family: 'Times New Roman', serif; }
.font-sans { font-family: 'Helvetica Neue', Arial, sans-serif; }
.font-script { font-family: 'Brush Script MT', cursive; font-style: italic; }

.ribbon {
  background: #d32f2f;
  color: white;
  padding: 4px 12px;
  margin-top: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  transform: skewX(-10deg);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.ribbon span {
  display: block;
  transform: skewX(10deg);
}

.bottom-text {
  margin-top: auto;
  font-size: 0.7rem;
  opacity: 0.9;
  padding-bottom: 20px;
}
</style>
