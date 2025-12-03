<template>
  <!-- Three.js will inject a <canvas> into this div -->
  <div ref="canvasContainer" class="bag-preview"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// DOM ref to the container div
const canvasContainer = ref(null);

// three.js core objects (plain JS vars, not reactive)
let scene;
let camera;
let renderer;
let controls;
let animationId;

// we need this reference so we can remove the listener later
function onWindowResize() {
  if (!renderer || !camera || !canvasContainer.value) return;

  const container = canvasContainer.value;
  const width = container.clientWidth;
  const height = container.clientHeight || 1;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

onMounted(() => {
  const container = canvasContainer.value;
  if (!container) return;

  // ---- 1) Scene ----
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;

  // ---- 2) Camera ----
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0.5, 2);

  // ---- 3) Renderer ----
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // ---- 4) Lights ----
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(2, 4, 5);
  scene.add(directionalLight);

  // ---- 5) OrbitControls (drag to rotate) ----
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false; // keep it simple
  controls.target.set(0, 0, 0);
  controls.update();

  // ---- 6) Load the GLB bag model ----
  const loader = new GLTFLoader();
  loader.load(
    '/models/bag.glb', // served from public/models/bag.glb
    (gltf) => {
      const bag = gltf.scene;

      // --- auto-center & frame the bag ---
      const box = new THREE.Box3().setFromObject(bag);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // move bag so its center is at (0, 0, 0)
      bag.position.sub(center);

      const maxSize = Math.max(size.x, size.y, size.z);
      const distance = maxSize * 1.8;

      camera.position.set(0, maxSize * 0.4, distance);
      camera.near = distance / 100;
      camera.far = distance * 10;
      camera.updateProjectionMatrix();

      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }

      // --- override all materials to flat gray ---
      bag.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x808080, // gray
            metalness: 0.1,
            roughness: 0.6,
          });
        }
      });

      scene.add(bag);

      // --- animation loop (no auto-spin, just controls + render) ---
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        if (controls) controls.update();
        renderer.render(scene, camera);
      };

      animate();
    },
    undefined,
    (error) => {
      console.error('Error loading bag.glb:', error);
    }
  );

  // ---- 7) Handle window resize ----
  window.addEventListener('resize', onWindowResize);
  onWindowResize(); // make sure it matches container size
});

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);

  if (controls) {
    controls.dispose();
    controls = null;
  }

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss?.();
    renderer = null;
  }

  scene = null;
  camera = null;
});
</script>

<style scoped>
.bag-preview {
  width: min(40vw, 500px);
  height: min(60vh, 600px);
  margin: 0 auto;
  border: 1px solid #444;
}
</style>
