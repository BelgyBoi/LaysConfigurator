<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
// OrbitControls removed
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
    type: Object, default: () => ({ x: .75, y: 0.45, align: 'center' })
  },
  imagePosition: {
    type: Object, default: () => ({ x: .75, y: 0.55 })
  },
})

// --- SCENE CONFIGURATION ---
// Adjust these values to change the spatial positioning
const sceneSettings = {
  bag: {
    offsetX: -0.5,    // Shift left/right (negative is left)
    offsetY: 0,    // Shift up/down relative to calculated bottom
    rotationY: 0.25,   // Spin (Yaw)
    rotationX: 0.1,     // Tilt Forward/Back (Pitch)
    rotationZ: 0.18,   // Tilt Sideways (Roll)
  },
  environment: {
    rotationY: Math.PI / 1.85, // Rotate the HDRI background
  },
  camera: {
    fov: 55,          // Field of view (lower = zoomed in background)
    startZFactor: 1.2,  // Multiplier for auto-distance calculation
    centerY: 0.05      // Height factor (multiplier of object size). Higher = see more floor, less ceiling
  }
}

// DOM ref to the container div
const canvasContainer = ref(null)

// three.js core objects (plain JS vars, not reactive)
let scene
let camera
let renderer
// let controls // Removed
// let controls // Removed
let bag = null
let isDragging = false
let previousMousePosition = { x: 0, y: 0 }

function onMouseDown(e) {
  isDragging = true
  previousMousePosition = { x: e.clientX, y: e.clientY }
}

function onMouseMove(e) {
  if (!isDragging || !bag) return
  const deltaX = e.clientX - previousMousePosition.x
  const deltaY = e.clientY - previousMousePosition.y
  previousMousePosition = { x: e.clientX, y: e.clientY }

  bag.rotation.y += deltaX * 0.005
  bag.rotation.x += deltaY * 0.005
}

function onMouseUp() {
  isDragging = false
}
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
  camera = new THREE.PerspectiveCamera(sceneSettings.camera.fov, width / height, 0.1, 100)
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
  // ---- 5) Controls (Manual Object Rotation) ----
  // We attach listeners to the container and window
  container.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  // ---- 6) Load the GLB bag model ----
  const loader = new GLTFLoader()
  loader.load(
    '/models/bag.glb', // served from public/models/bag.glb
    (gltf) => {
      bag = gltf.scene


      // --- auto-center & frame the bag ---
      const box = new THREE.Box3().setFromObject(bag)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      bag.position.sub(center)

      const maxSize = Math.max(size.x, size.y, size.z)

      const fovRad = camera.fov * (Math.PI / 180)
      const distance = Math.abs(maxSize / (2 * Math.tan(fovRad / 2))) * sceneSettings.camera.startZFactor

      camera.position.set(0, maxSize * sceneSettings.camera.centerY, distance)
      camera.near = distance / 100
      camera.far = distance * 10
      camera.far = distance * 10
      camera.updateProjectionMatrix()
      camera.lookAt(0, 0, 0) // Look at standard center to tilt camera down



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

      // Generate the initial texture (with logo) immediately
      updateBagAppearance()

      scene.add(bag)

      // Apply offsets and rotation
      // We use += so we don't lose the auto-centering adjustment
      bag.position.x += sceneSettings.bag.offsetX
      bag.position.y += sceneSettings.bag.offsetY
      bag.rotation.y = sceneSettings.bag.rotationY
      bag.rotation.x = sceneSettings.bag.rotationX
      bag.rotation.z = sceneSettings.bag.rotationZ

      // (Controls removed)

      // --- animation loop (no auto-spin, just controls + render) ---
      const animate = () => {
        animationId = requestAnimationFrame(animate)

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
      scene.backgroundRotation.y = sceneSettings.environment.rotationY
      scene.environmentRotation.y = sceneSettings.environment.rotationY

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

  if (canvasContainer.value) {
    canvasContainer.value.removeEventListener('mousedown', onMouseDown)
  }
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)

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

  // Scale factors based on 1024px width
  const s = width / 1024

  if (pattern === 'stripes') {
    ctx.translate(0, 0)
    ctx.rotate((-10 * Math.PI) / 180)
    const stripeWidth = 30 * s * 6 // roughly 180px wide stripes
    for (let x = -width; x < width * 2; x += stripeWidth * 2) {
      ctx.fillRect(x, -height, stripeWidth, height * 3)
    }
  } else if (pattern === 'dots') {
    const radius = 10 * s * 4 // 40px radius
    const gap = 50 * s * 5    // 250px gap
    for (let y = 0; y < height + gap; y += gap) {
      for (let x = 0; x < width + gap; x += gap) {
        ctx.beginPath()
        ctx.arc(x + (y % (gap * 2) === 0 ? 0 : radius), y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (pattern === 'waves') {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 12 * s * 4
    const amplitude = 20 * s * 5
    const wavelength = 160 * s * 4
    for (let y = 80 * s * 4; y < height + 80 * s * 4; y += 80 * s * 4) {
      ctx.beginPath()
      for (let x = 0; x <= width; x += 10 * s * 4) {
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
      return '700 60px "Times New Roman", Georgia, serif'
    case 'sans':
      return '700 60px "Helvetica Neue", Arial, sans-serif'
    case 'script':
      return '700 80px "Pacifico", "Brush Script MT", cursive'

    default:
      return '700 60px "Helvetica Neue", Arial, sans-serif'
  }
}

// Helper to wrap text into lines
function getLines(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = ctx.measureText(currentLine + ' ' + word).width
    if (width < maxWidth) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)
  return lines
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

  // Constrain text to 35% of width
  const maxWidth = width * 0.35

  const lines = getLines(ctx, text, maxWidth)

  const lineHeight = parseInt(getFontStack(fontKey).match(/\d+px/)?.[0] || '60') * 1.2
  // Max height constraint: Limit to 3 lines
  const maxLines = 4
  const visibleLines = lines.slice(0, maxLines)



  // Center X: 0.75 * width
  const cx = width * (pos?.x ?? 0.75)
  // Top Y: based on pos.y
  let startY = (height * (pos?.y ?? 0.45))

  visibleLines.forEach((line, index) => {
    ctx.fillText(line, cx, startY + (index * lineHeight) + (lineHeight/2))
  })

  ctx.restore()
}


function drawRearGraphics(ctx, img, cx, cy, width) {
  ctx.save()
  const scale = width / 1024

  // The generated image should be sized appropriately.
  // Let's assume we want it to cover a good portion of the back.
  // Original programmatic box was 350px wide.
  // Let's scale the image to be similar width or fit nicely.

  const targetWidth = 380 * scale
  const aspectRatio = img.width / img.height
  const targetHeight = targetWidth / aspectRatio

  const x = cx - targetWidth / 2
  const y = cy - targetHeight / 2 // Centered vertically on the 'cy' point

  ctx.drawImage(img, x, y, targetWidth, targetHeight)


  ctx.restore()
}


function drawBackSeam(ctx, cx, height, width) {
  const scale = width / 1024
  const seamWidth = 20 * scale  // Reduced from 35

  ctx.save()

  // 1. Drop shadow to simulate extrusion/sitting on top
  // Draw a blurred black rect slightly OFFSET to the LEFT (mirrored)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 10 * scale
  ctx.shadowOffsetX = -4 * scale // Negative for left offset
  ctx.fillStyle = 'rgba(0,0,0,0)' // invisible fill, just for shadow
  ctx.fillRect(cx - seamWidth/2, 0, seamWidth, height)

  // Reset shadow for main drawing
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0

  // 2. The main white seam tape
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.fillRect(cx - seamWidth/2, 0, seamWidth, height)

  // 3. Silver foil edge (uneven press)
  // Mirror: Put thin silver strip on the LEFT edge
  const foilWidth = 8 * scale
  const foilX = cx - seamWidth/2 // Start at left edge

  const foilGradient = ctx.createLinearGradient(foilX, 0, foilX + foilWidth, 0)
  foilGradient.addColorStop(0, '#909090') // Darker out
  foilGradient.addColorStop(0.4, '#a8a8a8')
  foilGradient.addColorStop(0.7, '#ffffff')
  foilGradient.addColorStop(1, '#d1d1d1')

  ctx.fillStyle = foilGradient
  ctx.fillRect(foilX, 0, foilWidth, height)

  // 4. Gradient overlay for 3D tube shape of the seam
  const gradient = ctx.createLinearGradient(cx - seamWidth/2, 0, cx + seamWidth/2, 0)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)')   // Shadow Left
  gradient.addColorStop(0.15, 'rgba(0, 0, 0, 0)') // curve up
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)') // Highlight Top
  gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0)') // curve down
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)')   // Shadow Right

  ctx.fillStyle = gradient
  ctx.fillRect(cx - seamWidth/2, 0, seamWidth, height)

  // 5. Thin crisp lines for edges
  ctx.lineWidth = 0.5 * scale
  ctx.strokeStyle = 'rgba(0,0,0, 0.2)'

  // Left Edge
  ctx.beginPath()
  ctx.moveTo(cx - seamWidth/2, 0)
  ctx.lineTo(cx - seamWidth/2, height)
  ctx.stroke()

  // Right Edge
  ctx.beginPath()
  ctx.moveTo(cx + seamWidth/2, 0)
  ctx.lineTo(cx + seamWidth/2, height)
  ctx.stroke()

  ctx.restore()
}

function drawBottomCrimps(ctx, width, height) {
  ctx.save()
  const scale = width / 1024
  // Assume bottom crimp area is the bottom ~5-8% of the texture
  const crimpHeight = 80 * scale
  const startY = height - crimpHeight

  // Clip to bottom area
  ctx.beginPath()
  ctx.rect(0, startY, width, crimpHeight)
  ctx.clip()

  // Draw horizontal lines to simulate ridges
  const ridgeCount = 12
  const step = crimpHeight / ridgeCount

  for (let i = 0; i < ridgeCount; i++) {
    const y = startY + (i * step)

    // Highlight top of ridge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.fillRect(0, y, width, step * 0.5)

    // Shadow bottom of ridge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fillRect(0, y + step * 0.5, width, step * 0.5)
  }

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

  const width = 1024
  const height = 1024
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = normalizeColor(props.color)
  ctx.fillRect(0, 0, width, height)

  // Draw Rear Graphics - Back of bag
  // Note: Vite serves 'public' at root
  const backsideEl = await loadImageElement('/assets/lays-backside.png')
  if (token !== updateToken) return

  if (backsideEl) {
     drawRearGraphics(ctx, backsideEl, width * 0.25, height * 0.5, width)
  }

  // Draw the rear seam overlay (after graphics so it sits on top)
  // Shift slightly right (0.26) - micro adjusted
  drawBackSeam(ctx, width * 0.26, height, width)

  // Draw bottom crimps (ribbles)
  drawBottomCrimps(ctx, width, height)


  drawPattern(ctx, props.pattern, width, height)

  // --- Draw User Image (Backdrop) ---
  const imageEl = await loadImageElement(props.image)
  if (token !== updateToken) return
  if (imageEl) {
    // Constrain to slightly wider than text (text is 0.35 * width)
    const targetWidth = width * 0.35 * 1.2

    // Center X of the strip
    const stripCx = width * (props.imagePosition?.x ?? 0.75)

    // Define the full-height strip area
    const stripX = stripCx - targetWidth / 2
    const stripY = 0
    const stripH = height // Full height

    ctx.save()
    ctx.beginPath()
    ctx.rect(stripX, stripY, targetWidth, stripH)
    ctx.clip()

    // Calculate scale to "cover" the strip area
    // We want the image to fill the strip width AND strip height (which is full height)
    // So we take the larger of the two required scales
    const scaleW = targetWidth / imageEl.width
    const scaleH = stripH / imageEl.height
    const scale = Math.max(scaleW, scaleH)

    const drawW = imageEl.width * scale
    const drawH = imageEl.height * scale

    // Draw centered on the strip center (stripCx) and vertical center (or props.y)
    // If we want "fill full height", aligning to vertical center of bag is safest to ensure coverage
    const cx = stripCx
    const cy = height * (props.imagePosition?.y ?? 0.5) // Allow small vertical adjustment if user wants, but default center

    const dx = cx - drawW / 2
    const dy = cy - drawH / 2

    ctx.drawImage(imageEl, dx, dy, drawW, drawH)
    ctx.restore()
  }

  // --- Draw Static Lays Logo ---
  // Note: Vite serves 'public' at root, so path is /assets/...
  const logoEl = await loadImageElement('/assets/logo-lays.png')
  if (token !== updateToken) return

  if (logoEl) {
    const logoScale = 0.2 // Reduced size to 20%
    const logoAspectRatio = logoEl.width / logoEl.height
    const drawW = width * logoScale
    const drawH = drawW / logoAspectRatio

    // Align X with label (0.75) - matching other assets
    const cx = width * 0.75
    const dx = cx - drawW / 2
    const dy = height * 0.22

    ctx.drawImage(logoEl, dx, dy, drawW, drawH)
  }

  drawLabel(ctx, props.name, props.font, width, height, props.labelPosition)




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


</style>
