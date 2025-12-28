<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

const props = defineProps({
  color: {
    type: String,
    default: '#a0a3a6',
  },
  pattern: {
    type: String,
    default: '',
  },
  packaging: {
    type: String,
    default: 'matte',
  },
  image: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  font: {
    type: String,
    default: '',
  },
  labelPosition: {
    type: Object, default: () => ({ x: .75, y: 0.2, align: 'center' })
  },
  imagePosition: {
    type: Object, default: () => ({ x: .8, y: 0.55 })
  },

})

// DOM ref to the container div
const canvasContainer = ref(null)

// three.js core objects (plain JS vars, not reactive)
let scene
let camera
let renderer
let controls
let animationId
const bagMaterials = []
let bagTexture = null
let updateToken = 0

// we need this reference so we can remove the listener later
function onWindowResize() {
  if (!renderer || !camera || !canvasContainer.value) return

  const container = canvasContainer.value
  const width = container.clientWidth
  const height = container.clientHeight || 1

  renderer.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

onMounted(() => {
  const container = canvasContainer.value
  if (!container) return

  // ---- 1) Scene ----
  scene = new THREE.Scene()

  const width = container.clientWidth || 600
  const height = container.clientHeight || 400

  // ---- 2) Camera ----
  camera = new THREE.PerspectiveCamera(85, width / height, 0.1, 100)
  camera.position.set(0, 0.5, 2)

  // ---- 3) Renderer ----
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true // <--- Enable shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  // ---- 4) Lights ----
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0)
  keyLight.position.set(2, 4, 5)
  keyLight.castShadow = true // <--- Casting shadow
  keyLight.shadow.mapSize.width = 1024
  keyLight.shadow.mapSize.height = 1024
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5)
  fillLight.position.set(-2, -3, -4)
  scene.add(fillLight)

  // ---- 5) OrbitControls (drag to rotate) ----
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enablePan = true // Re-enabled panning per request "move around"
  controls.minDistance = 2
  controls.maxDistance = 20
  controls.target.set(0, 0, 0)
  controls.update()

  // ---- 6) Load the GLB bag model ----
  const loader = new GLTFLoader()
  loader.load(
    '/models/bag.glb', // served from public/models/bag.glb
    (gltf) => {
      const bag = gltf.scene


      // --- auto-center & frame the bag ---
      const box = new THREE.Box3().setFromObject(bag)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      bag.position.sub(center)

      // Calculate bottom for shadow plane
      const bagBottomY = -size.y / 2

      const maxSize = Math.max(size.x, size.y, size.z)

      // Dynamic distance based on FOV to keep object size consistent while showing more background
      // Increased FOV means we need to get closer to keep object frame size, but user wants 'HDRI zoomed out',
      // which is physically achieved by wide FOV + closer camera (Dolly Zoom effect).
      const fovRad = camera.fov * (Math.PI / 180)
      const distance = Math.abs(maxSize / (2 * Math.tan(fovRad / 2))) * 1.8

      camera.position.set(0, maxSize * 0.4, distance)
      camera.near = distance / 100
      camera.far = distance * 10
      camera.updateProjectionMatrix()

      if (controls) {
        controls.target.set(0, 0, 0)
        controls.update()
      }

      // --- override all materials to flat gray ---
      bag.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true     // <--- Bag casts shadow
          child.receiveShadow = true

          const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.6,
            map: null,
          })
          child.material = material
          bagMaterials.push(material)
        }
      })

      scene.add(bag)

      // --- Base / Plinth ---
      // A small cylinder for the bag to "stand" on (Trophy style)
      // Radius slightly larger than the bag's widest point
      const baseRadius = Math.max(size.x, size.z) * 0.65

      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.2,
        metalness: 0.8
      })
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(baseRadius, baseRadius, 0.2, 64),
        baseMaterial
      )

      // Shift base slightly left
      const shiftX = -0.5
      base.position.x = shiftX
      base.position.y = bagBottomY - 0.1 // Sit just below bag
      base.receiveShadow = true
      scene.add(base)

      // Also shift bag to match base
      bag.position.x = shiftX

      // --- animation loop (no auto-spin, just controls + render) ---
      const animate = () => {
        animationId = requestAnimationFrame(animate)

        if (controls) controls.update()
        renderer.render(scene, camera)
      }

      animate()
    },
    undefined,
    (error) => {
      console.error('Error loading bag.glb:', error)
    },
  )

  // ---- 7) Load the Environment (using RGBELoader for .hdr format) ----
  new RGBELoader().load(
    '/textrures/neon_photostudio_2k.hdr', // Note: using folder name 'textrures' as created
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      scene.environment = texture
      scene.background = texture

      // Rotate background to show the neon lights behind the bag
      scene.backgroundRotation.y = Math.PI / 1.45
      scene.environmentRotation.y = Math.PI / 1.45

      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.0
    },
    undefined,
    (err) => console.error('Error loading HDRI:', err)
  )

  // ---- 8) Handle window resize ----
  window.addEventListener('resize', onWindowResize)
  onWindowResize() // make sure it matches container size
})

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onWindowResize)

  bagMaterials.forEach((material) => material.dispose())
  bagMaterials.length = 0
  if (bagTexture) {
    bagTexture.dispose()
    bagTexture = null
  }

  if (controls) {
    controls.dispose()
    controls = null
  }

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss?.()
    renderer = null
  }

  scene = null
  camera = null
})

function normalizeColor(value) {
  if (typeof value === 'string' && value.trim()) return value
  return '#a0a3a6'
}

function applyPackaging(material, packaging) {
  const mode = packaging || 'matte'
  switch (mode) {
    case 'glossy':
      material.metalness = 0.35
      material.roughness = 0.2
      break
    case 'recyclable':
      material.metalness = 0.12
      material.roughness = 0.5
      break
    case 'matte':
    default:
      material.metalness = 0.1
      material.roughness = 0.7
      break
  }
}

function drawPattern(ctx, pattern, width, height) {
  if (!pattern) return
  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#ffffff'

  if (pattern === 'stripes') {
    ctx.translate(0, 0)
    ctx.rotate((-10 * Math.PI) / 180)
    const stripeWidth = 30
    for (let x = -width; x < width * 2; x += stripeWidth * 2) {
      ctx.fillRect(x, -height, stripeWidth, height * 3)
    }
  } else if (pattern === 'dots') {
    const radius = 10
    const gap = 50
    for (let y = 0; y < height + gap; y += gap) {
      for (let x = 0; x < width + gap; x += gap) {
        ctx.beginPath()
        ctx.arc(x + (y % (gap * 2) === 0 ? 0 : radius), y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (pattern === 'waves') {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 12
    const amplitude = 20
    const wavelength = 160
    for (let y = 80; y < height + 80; y += 80) {
      ctx.beginPath()
      for (let x = 0; x <= width; x += 10) {
        const yOffset = Math.sin((x / wavelength) * Math.PI * 2) * amplitude
        ctx.lineTo(x, y + yOffset)
      }
      ctx.stroke()
    }
  }
  ctx.restore()
}

function getFontStack(fontKey) {
  switch (fontKey) {
    case 'serif':
      return '700 68px "Times New Roman", Georgia, serif'
    case 'sans':
      return '700 64px "Helvetica Neue", Arial, sans-serif'
    case 'script':
      return '700 68px "Pacifico", "Brush Script MT", cursive'
    default:
      return '700 64px "Helvetica Neue", Arial, sans-serif'
  }
}

function drawLabel(ctx, text, fontKey, width, height, pos) {
  if (!text) return
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.textAlign = pos?.align || 'center'
  ctx.textBaseline = 'middle'
  ctx.font = getFontStack(fontKey)
  ctx.shadowColor = 'rgba(255, 255, 255, 0.4)'
  ctx.shadowBlur = 12
  ctx.fillText(text, width * (pos?.x ?? 0.5), height * (pos?.y ?? 0.2))
  ctx.restore()
}

function loadImageElement(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function updateBagAppearance() {
  const token = ++updateToken
  if (!bagMaterials.length) return

  const width = 100
  const height = 100
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = normalizeColor(props.color)
  ctx.fillRect(0, 0, width, height)

  drawPattern(ctx, props.pattern, width, height)
  drawLabel(ctx, props.name, props.font, width, height, props.labelPosition)


  const imageEl = await loadImageElement(props.image)
  if (token !== updateToken) return
  if (imageEl) {
    const scale = Math.min(width / imageEl.width, height / imageEl.height, 1)
    const drawW = imageEl.width * scale
    const drawH = imageEl.height * scale
    const cx = width * (props.imagePosition?.x ?? 0.5)
    const cy = height * (props.imagePosition?.y ?? 0.55)
    const dx = cx - drawW / 2
    const dy = cy - drawH / 2
    ctx.drawImage(imageEl, dx, dy, drawW, drawH)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.anisotropy = renderer?.capabilities?.getMaxAnisotropy
    ? renderer.capabilities.getMaxAnisotropy()
    : 1

  const previousTexture = bagTexture
  bagTexture = texture

  bagMaterials.forEach((material) => {
    material.map = texture
    material.color.set('#ffffff')
    applyPackaging(material, props.packaging)
    material.needsUpdate = true
  })

  if (previousTexture && previousTexture !== texture) {
    previousTexture.dispose()
  }
}

watch(
  () => [props.color, props.pattern, props.packaging, props.image, props.name, props.font, props.labelPosition, props.imagePosition],
  () => updateBagAppearance(),
  { immediate: true },
)
</script>

<template>
  <!-- Three.js will inject a <canvas> into this div -->
  <div ref="canvasContainer" class="bag-preview"></div>
</template>

<style scoped>
.bag-preview {
  width: 100%;
  height: 100%;
  display: block;
  margin: 0;
  box-sizing: border-box;
}

.swatches { display: flex; gap: 8px; flex-wrap: wrap; }
.swatch { width: 32px; height: 32px; border-radius: 8px; border: 2px solid #d6dbe2; cursor: pointer; }
.swatch.active { border-color: #333; box-shadow: 0 0 0 2px rgba(0,0,0,0.08); }

</style>
