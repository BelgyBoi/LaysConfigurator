<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

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
  readOnly: {
    type: Boolean,
    default: false
  },
  autoRotate: {
    type: Boolean,
    default: false
  },
  showBackground: {
    type: Boolean,
    default: true
  },
  contentMode: {
    type: String,
    default: 'studio' // 'studio' (configurator) or 'shelf' (feed)
  }
})

// --- SCENE CONFIGURATION ---
const sceneDefaults = {
  studio: {
    bag: {
      offsetX: -0.5,
      offsetY: 0, // Original lower position
      rotationY: 0.25,
      rotationX: 0.1,
      rotationZ: 0.18
    },
    camera: {
      fov: 55,
      startZFactor: 1.2,
      centerY: 0.05
    }
  },
  shelf: {
    bag: {
      offsetX: 0,
      offsetY: 0,
      rotationY: 0,
      rotationX: 0,
      rotationZ: 0
    },
    camera: {
      fov: 45,
      startZFactor: 0.8,
      centerY: 0
    }
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
  if (props.readOnly || !isDragging || !bag) return
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
  camera = new THREE.PerspectiveCamera(sceneDefaults.shelf.camera.fov, width / height, 0.1, 100) // Use a default for initial camera setup
  camera.position.set(0, 0.5, 2)

  // ---- 3) Renderer ----
  // preserveDrawingBuffer is required to capture the canvas dataURL
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(width, height)
  renderer.outputColorSpace = THREE.SRGBColorSpace
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

      const settings = sceneDefaults[props.contentMode] || sceneDefaults.studio

      // --- auto-center & frame the bag ---
      const box = new THREE.Box3().setFromObject(bag)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      bag.position.sub(center)

      const maxSize = Math.max(size.x, size.y, size.z)

      const fovRad = settings.camera.fov * (Math.PI / 180)
      const distance = Math.abs(maxSize / (2 * Math.tan(fovRad / 2))) * settings.camera.startZFactor

      camera.fov = settings.camera.fov
      camera.position.set(0, maxSize * settings.camera.centerY, distance)
      camera.near = distance / 100
      camera.far = distance * 10
      camera.updateProjectionMatrix()
      camera.lookAt(0, 0, 0)


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

      // Apply Initial Transforms based on Mode
      bag.position.x += settings.bag.offsetX
      bag.position.y += settings.bag.offsetY
      bag.rotation.y = settings.bag.rotationY
      bag.rotation.x = settings.bag.rotationX
      bag.rotation.z = settings.bag.rotationZ

      // (Controls removed)

      // --- animation loop (no auto-spin, just controls + render) ---
      const animate = () => {
        animationId = requestAnimationFrame(animate)

        if (props.autoRotate && bag) {
             bag.rotation.y += 0.005 // Slow spin
        }

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
  new HDRLoader().load(
    '/textrures/neon_photostudio_2k.hdr', // Note: using folder name 'textrures' as created
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      scene.environment = texture

      if (props.showBackground) {
         scene.background = texture
      } else {
         scene.background = null // Transparent/Clear
      }


      // Rotate background to show the neon lights behind the bag
      scene.backgroundRotation.y = Math.PI / 1.85
      scene.environmentRotation.y = Math.PI / 1.85

      renderer.toneMapping = THREE.NeutralToneMapping
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
    const stripeWidth = 30 * s * 1.5 // Reduced from * 6
    for (let x = -width; x < width * 2; x += stripeWidth * 2) {
      ctx.fillRect(x, -height, stripeWidth, height * 3)
    }
  } else if (pattern === 'dots') {
    const radius = 10 * s * 1.2 // Reduced from * 4
    const gap = 50 * s * 1.2    // Reduced from * 5
    for (let y = 0; y < height + gap; y += gap) {
      for (let x = 0; x < width + gap; x += gap) {
        ctx.beginPath()
        ctx.arc(x + (y % (gap * 2) === 0 ? 0 : radius), y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (pattern === 'waves') {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 12 * s * 1
    const amplitude = 20 * s * 1.5
    const wavelength = 160 * s * 1
    const step = 80 * s * 1
    for (let y = step; y < height + step; y += step) {
      ctx.beginPath()
      for (let x = 0; x <= width; x += 10 * s) {
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
      return '700 28px "Times New Roman", Georgia, serif'
    case 'sans':
      return '900 28px "Helvetica Neue", Arial, sans-serif'
    case 'script':
      return '700 36px "Pacifico", "Brush Script MT", cursive'

    default:
      return '900 28px "Helvetica Neue", Arial, sans-serif'
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

function drawLabel(ctx, text, fontKey, width, height, pos, bagColor) {
  if (!text) return
  ctx.save()

  const cx = width * (pos?.x ?? 0.75)
  // Text starts lower now, inside the box. Adjusted for new boxY = 0.3
  let startY = height * 0.43

  // Determine effective colors based on bag color
  // "only on yellow I need the text and the ribbon at the bottom to be a darker orangy yellow"
  // Default generic yellow approx hex check
  const isYellow = (bagColor === '#f8e503' || bagColor === '#f2b705' || !bagColor)
  const effectiveTextColor = isYellow ? '#d97706' : (bagColor || '#1f2937')

  // Main Flavor Name
  ctx.fillStyle = effectiveTextColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Font: Bold Condensed Sans
  ctx.font = getFontStack(fontKey)
  // Remove shadow for clean print look
  ctx.shadowColor = 'transparent'

  // Constrain width to fit inside the new box (width * 0.20)
  const maxWidth = width * 0.18 // Tighter constraint
  const upperText = text.toUpperCase()
  const lines = getLines(ctx, upperText, maxWidth)

  // Draw Flavor Name
  const lineHeight = 30 // Reduced leading
  const maxTextHeight = 100 // Max height allowed for text block

  let validLines = 0
  for (let index = 0; index < lines.length; index++) {
    const yPos = index * lineHeight
    if (yPos > maxTextHeight) break // Stop drawing if we exceed height

    ctx.fillText(lines[index], cx, startY + yPos)
    validLines = index + 1
  }

  // Draw "FLAVORED" - Position relative to effectively drawn lines
  const lastLineY = startY + ((validLines - 1) * lineHeight)
  ctx.fillStyle = effectiveTextColor // Use computed color
  ctx.font = '700 16px "Helvetica Neue", Arial, sans-serif' // Reduced from 24
  ctx.fillText("FLAVORED", cx, lastLineY + 25) // Reduced gap from 50

  // Draw "Made with Real Potatoes" Footer
  // Box is at boxY=0.3, boxH=0.3 -> Bottom is 0.6

  const boxTop = height * 0.3
  const boxHeight = height * 0.3
  const boxBottom = boxTop + boxHeight

  const boxWidth = width * 0.2
  const footerBaseH = 40
  const footerY = boxBottom - footerBaseH

  ctx.save()

  // 1. Footer Background
  // If yellow, use darker golden yellow. Else lighten bag color.
  let footerFill
  if (isYellow) {
      footerFill = '#fbbf24' // Golden/Orange yellow
  } else {
      const c = new THREE.Color(bagColor || '#db2777')
      c.offsetHSL(0, 0, 0.15) // Lighten
      footerFill = '#' + c.getHexString()
  }
  ctx.fillStyle = footerFill

  // Custom Path: Arched Top + Rounded Bottom Corners
  ctx.beginPath()
  const r = 20 // Corner radius
  const archH = 12 // Height of the top arch

  // Start Top Left
  ctx.moveTo(cx - boxWidth/2, footerY)

  // Top Arch (Quadratic curve to Top Right)
  ctx.quadraticCurveTo(cx, footerY - archH, cx + boxWidth/2, footerY)

  // Right Edge to near Bottom Right
  ctx.lineTo(cx + boxWidth/2, boxBottom - r)

  // Bottom Right Corner
  ctx.quadraticCurveTo(cx + boxWidth/2, boxBottom, cx + boxWidth/2 - r, boxBottom)

  // Bottom Edge
  ctx.lineTo(cx - boxWidth/2 + r, boxBottom)

  // Bottom Left Corner
  ctx.quadraticCurveTo(cx - boxWidth/2, boxBottom, cx - boxWidth/2, boxBottom - r)

  // Close to start
  ctx.closePath()

  ctx.fill()

  // 2. Horizontal Pinstripes (Texture)
  ctx.save()
  ctx.clip() // Clip to the custom footer shape

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1
  // Draw lines across the footer
  // Start slightly higher to cover the arch
  for(let y = footerY - archH; y < boxBottom; y += 4) {
      ctx.beginPath()
      ctx.moveTo(cx - boxWidth/2, y)
      ctx.lineTo(cx + boxWidth/2, y)
      ctx.stroke()
  }
  ctx.restore()

  // 3. Text
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff' // White text
  ctx.shadowColor = 'rgba(0,0,0,0.2)'
  ctx.shadowBlur = 2

  // "MADE WITH" - Small, Top, Curved area
  ctx.font = '700 8px "Helvetica Neue", Arial, sans-serif'
  ctx.letterSpacing = '1px'
  // Slight arch simulation for text: just placement for now
  ctx.fillText("MADE WITH", cx, footerY + 8)

  // "REAL POTATOES" - Larger, Bottom
  ctx.font = '900 13px "Helvetica Neue", Arial, sans-serif'
  ctx.letterSpacing = '1px'
  ctx.fillText("REAL POTATOES", cx, footerY + 24)

  ctx.restore()

  ctx.restore()
}

function drawWoodTexture(ctx, width, height) {
  ctx.save()
  const plankCount = 10
  const plankW = width / plankCount

  // Use 'soft-light' to blend texture onto the user's base color
  ctx.globalCompositeOperation = 'soft-light'

  for (let i = 0; i < plankCount; i++) {
    const x = i * plankW
    // Alternate darkness for planks
    ctx.fillStyle = i % 2 === 0 ? '#000000' : '#ffffff'
    ctx.globalAlpha = 0.15 // Subtle
    ctx.fillRect(x, 0, plankW, height)

    // Seams
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#000000'
    ctx.fillRect(x, 0, 2, height)
  }

  // Wood Grain
  ctx.globalAlpha = 0.1
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 3
  for (let x = 0; x < width; x += 12) {
     if (Math.random() > 0.6) {
       ctx.beginPath()
       ctx.moveTo(x, 0)
       // Wobbly line
       ctx.bezierCurveTo(x + 5, height/3, x - 5, height*2/3, x, height)
       ctx.stroke()
     }
  }
  ctx.restore()
}

function drawCenterHighlight(ctx, width, height, cx) {
  // "rectangle across the full height at the front in white with an opacity of rougly 25% ish"
  ctx.save()
  const stripW = width * 0.08 // Central visual area
  const stripH = height * 0.3 // Stop behind the logo (logo is at ~0.2)

  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.25
  ctx.globalCompositeOperation = 'source-over' // Just simple overlay
  ctx.fillRect(cx - stripW/2, 0, stripW, stripH)

  // Add stitched/dashed lines on the edges
  ctx.globalAlpha = 0.6
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 8]) // Dashed line pattern

  // Left Line
  ctx.beginPath()
  ctx.moveTo(cx - stripW/2 + 4, 0)
  ctx.lineTo(cx - stripW/2 + 4, stripH)
  ctx.stroke()

  // Right Line
  ctx.beginPath()
  ctx.moveTo(cx + stripW/2 - 4, 0)
  ctx.lineTo(cx + stripW/2 - 4, stripH)
  ctx.stroke()

  ctx.setLineDash([]) // Reset
  ctx.restore()
}

function drawTopDetails(ctx, width, height, cx) {
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 16px "Helvetica Neue", Arial, sans-serif'
  // Shadow for legibility
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 4

  const y = height * 0.15
  const spacing = width * 0.13

  // Helper to draw flanked lines
  const drawFlankedText = (text, x, y, font, gap = 15, lineW = 20) => {
    ctx.font = font
    const w = ctx.measureText(text).width
    ctx.fillText(text, x, y)

    ctx.lineWidth = 1
    ctx.strokeStyle = '#ffffff'
    ctx.beginPath()
    // Left Line
    ctx.moveTo(x - w/2 - gap - lineW, y)
    ctx.lineTo(x - w/2 - gap, y)
    // Right Line
    ctx.moveTo(x + w/2 + gap, y)
    ctx.lineTo(x + w/2 + gap + lineW, y)
    ctx.stroke()
  }

  // Left: No Colors
  ctx.strokeStyle = '#ffffff'
  ctx.fillText("NO COLORS", cx - spacing, y - 12) // Moved up slightly
  // Flanked "from"
  drawFlankedText("from", cx - spacing, y + 4, 'italic 13px "Helvetica Neue", Arial, sans-serif') // Slightly smaller font, more space

  ctx.font = '700 14px "Helvetica Neue", Arial, sans-serif' // Reduced from 16px
  ctx.fillText("ARTIFICIAL SOURCES", cx - spacing, y + 20) // Increased gap (was +14)

  // Right: No Artificial
  ctx.fillText("NO", cx + spacing, y - 8)
  ctx.fillText("ARTIFICIAL", cx + spacing, y + 8)
  // Flanked "Flavors"
  drawFlankedText("Flavors", cx + spacing, y + 24, 'italic 16px "Times New Roman", serif')

  // Center: Est 1938
  const bannerY = y
  ctx.fillStyle = '#000000' // Black text

  ctx.font = '700 14px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText("-EST.-", cx, bannerY - 8)
  ctx.font = '900 20px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText("1938", cx, bannerY + 10)

  ctx.restore()
}

function drawFlavorBox(ctx, width, height, cx) {
  // Partial height box under logo
  const stripW = width * 0.2
  const boxY = height * 0.3
  const boxH = height * 0.3

  ctx.save()
  // Cream colored box
  ctx.fillStyle = '#fdfbf7'
  ctx.shadowColor = 'rgba(0,0,0,0.2)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 5

  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(cx - stripW/2, boxY, stripW, boxH, 20)
  } else {
    ctx.rect(cx - stripW/2, boxY, stripW, boxH)
  }
  ctx.fill()

  // Thin pinstripes on the box (classic Lays look)
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'
  ctx.lineWidth = 1
  for(let x = cx - stripW/2 + 10; x < cx + stripW/2; x+=10) {
    ctx.beginPath()
    ctx.moveTo(x, boxY)
    ctx.lineTo(x, boxY + boxH)
    ctx.stroke()
  }

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

  // Apply Bag Wood Texture (Base Layer)
  drawWoodTexture(ctx, width, height)

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

  // --- Rebrand: Layers ---
  const centerX = width * 0.75

  // 1. Center Highlight (25% White)
  drawCenterHighlight(ctx, width, height, centerX)

  // 2. Top Details (Text)
  drawTopDetails(ctx, width, height, centerX)

    // --- Draw User Image (Backdrop) ---
  const imageEl = await loadImageElement(props.image)
  if (token !== updateToken) return
  if (imageEl) {
    // Constrain to slightly wider than text
    const targetWidth = width * 0.35 * 1.2

    // Center X of the strip
    const stripCx = width * (props.imagePosition?.x ?? 0.75)

    // Calculate Y "stack" position:
    // Logo is at ~0.22 height
    // Text is at ~0.45 height
    // Image should be below text. Let's start around 0.55 or 0.6

    const stripY = height * 0.55 // Start lower down
    const stripH = height * 0.35 // Take up ~35% of height (bottom area)
    const stripX = stripCx - targetWidth / 2

    ctx.save()
    ctx.beginPath()
    // Define the "box" for the image to sit in
    ctx.rect(stripX, stripY, targetWidth, stripH)
    ctx.clip()

    // Calculate scale to CONTAIN the image within this box
    // (User wanted it "contained on the bag")
    const scaleW = targetWidth / imageEl.width
    const scaleH = stripH / imageEl.height
    const scale = Math.min(scaleW, scaleH) // FIT it inside

    const drawW = imageEl.width * scale
    const drawH = imageEl.height * scale

    // Center in the box
    const dx = stripX + (targetWidth - drawW) / 2
    const dy = stripY + (stripH - drawH) / 2

    ctx.drawImage(imageEl, dx, dy, drawW, drawH)
    ctx.restore()
  }

  // 3. Flavor Box (Cream Panel)
  drawFlavorBox(ctx, width, height, centerX)

  // --- Draw Static Lays Logo ---
  // Note: Vite serves 'public' at root, so path is /assets/...
  const logoEl = await loadImageElement('/assets/logo-lays.png')
  if (token !== updateToken) return

  if (logoEl) {
    const logoScale = 0.25 // Reduced size to 20%
    const logoAspectRatio = logoEl.width / logoEl.height
    const drawW = width * logoScale
    const drawH = drawW / logoAspectRatio

    // Align X with label (0.75) - matching other assets
    const cx = width * 0.75
    const dx = cx - drawW / 2
    const dy = height * 0.18 // Moved up from 0.22

    ctx.drawImage(logoEl, dx, dy, drawW, drawH)
  }

  drawLabel(ctx, props.name, props.font, width, height, props.labelPosition, props.color)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
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
function captureSnapshot(quality = 0.8, type = 'image/png') {
  if (!renderer || !scene || !camera) return null

  // 1. Save current state
  const savedPos = camera.position.clone()
  const savedQuat = camera.quaternion.clone()

  // 2. Prepare for snapshot
  // Keep background (User Request)

  // Force Front-Facing & Centered View
  // Reset camera to perfect front angle
  // 3.5 is an empirical value for a tight crop on the bag at 0,0,0
  camera.position.set(0, 0, 3.5)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()

  // 3. Render
  renderer.render(scene, camera)
  const dataUrl = renderer.domElement.toDataURL(type, quality)

  // 4. Restore state
  camera.position.copy(savedPos)
  camera.quaternion.copy(savedQuat)
  camera.updateMatrixWorld()

  // 5. Re-render to restore view
  renderer.render(scene, camera)

  return dataUrl
}

defineExpose({
  captureSnapshot,
  getSnapshot
})
// --- 9) Public API for Snapshot ---
// We need to render synchronously to capture the buffer
function getSnapshot() {
  if (!renderer || !scene || !camera) {
      console.error("getSnapshot: Missing THREE.js instances", { renderer: !!renderer, scene: !!scene, camera: !!camera });
      return null
  }

  // Render one frame to ensure buffer is populated if using preserveDrawingBuffer
  renderer.render(scene, camera)

  // Create a smaller canvas for the snapshot
  const maxDimension = 600 // Restored to 600px (Server limit increased to 50MB)
  const originalCanvas = renderer.domElement

  const aspect = originalCanvas.width / originalCanvas.height
  let width = originalCanvas.width
  let height = originalCanvas.height

  // Downscale if needed
  if (width > maxDimension || height > maxDimension) {
      if (width > height) {
          width = maxDimension
          height = width / aspect
      } else {
          height = maxDimension
          width = height * aspect
      }
  }

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const ctx = tempCanvas.getContext('2d')

  // Draw the 3D canvas onto the temp canvas
  ctx.drawImage(originalCanvas, 0, 0, width, height)

  // Capture as JPEG with good quality (0.8)
  return tempCanvas.toDataURL('image/jpeg', 0.8)
}


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
