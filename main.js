import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ---------- UI: mobile menu + year + contact guard ---------- */
(function initUI(){
  const burger = $("#burger");
  const mobilemenu = $("#mobilemenu");
  if (burger && mobilemenu){
    burger.addEventListener("click", () => {
      const open = mobilemenu.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    $$("#mobilemenu a").forEach(a => a.addEventListener("click", () => {
      mobilemenu.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }));
  }

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  const form = $("#contactForm");
  if (form){
    form.addEventListener("submit", (e) => {
      if (!form.action){
        e.preventDefault();
        alert('To enable the form, add your Formspree endpoint to the form action attribute.');
      }
    });
  }
})();

/* ---------- Three.js: tasteful background scene ---------- */

// Respect reduced motion
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Canvas + renderer
const canvas = $("#scene");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

// Cap pixel ratio for mobile performance
function setRendererSize(){
  const pr = Math.min(window.devicePixelRatio || 1, 1.6);
  renderer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}
setRendererSize();

// Scene + camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0.6, 6.5);

// Lighting (subtle)
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xffffff, 0.55);
key.position.set(3, 4, 2);
scene.add(key);

// Group
const group = new THREE.Group();
scene.add(group);

// A soft “data orbit” look: points + rings
const ringGeo = new THREE.TorusGeometry(1.6, 0.008, 12, 240);
const ringMat = new THREE.MeshStandardMaterial({
  color: 0x7c3aed,
  emissive: 0x16001f,
  metalness: 0.2,
  roughness: 0.9,
  transparent: true,
  opacity: 0.55
});
const ring1 = new THREE.Mesh(ringGeo, ringMat);
ring1.rotation.x = Math.PI * 0.35;
ring1.rotation.y = Math.PI * 0.20;
group.add(ring1);

const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
ring2.material.color.setHex(0x06b6d4);
ring2.material.opacity = 0.35;
ring2.rotation.x = Math.PI * 0.60;
ring2.rotation.y = Math.PI * -0.15;
ring2.scale.setScalar(1.25);
group.add(ring2);

// Points cloud
const ptsCount = 1400;
const positions = new Float32Array(ptsCount * 3);
const speeds = new Float32Array(ptsCount);

for (let i = 0; i < ptsCount; i++){
  // donut-ish distribution
  const r = 1.2 + Math.random() * 1.9;
  const t = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 1.6;
  positions[i*3 + 0] = Math.cos(t) * r;
  positions[i*3 + 1] = y;
  positions[i*3 + 2] = Math.sin(t) * r;
  speeds[i] = 0.15 + Math.random() * 0.55;
}

const ptsGeo = new THREE.BufferGeometry();
ptsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const ptsMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.012,
  transparent: true,
  opacity: 0.72,
  depthWrite: false
});

const points = new THREE.Points(ptsGeo, ptsMat);
group.add(points);

// A subtle central “core”
const coreGeo = new THREE.SphereGeometry(0.22, 28, 28);
const coreMat = new THREE.MeshStandardMaterial({
  color: 0x0b1220,
  emissive: 0x220a45,
  emissiveIntensity: 0.9,
  roughness: 0.4,
  metalness: 0.1
});
const core = new THREE.Mesh(coreGeo, coreMat);
group.add(core);

// Mouse parallax (small)
let targetX = 0, targetY = 0;
window.addEventListener("pointermove", (e) => {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = (e.clientY / window.innerHeight) * 2 - 1;
  targetX = x * 0.25;
  targetY = -y * 0.15;
}, { passive: true });

// Pause when tab not visible
let running = true;
document.addEventListener("visibilitychange", () => {
  running = !document.hidden;
});

// Resize
window.addEventListener("resize", () => {
  setRendererSize();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Animation loop
const clock = new THREE.Clock();

function tick(){
  if (running){
    const t = clock.getElapsedTime();

    // Slow global rotation
    if (!prefersReducedMotion){
      group.rotation.y = t * 0.08;
      group.rotation.x = t * 0.03;

      // Points gentle drift
      const pos = ptsGeo.attributes.position.array;
      for (let i = 0; i < ptsCount; i++){
        const idx = i * 3;
        pos[idx + 1] += Math.sin(t * speeds[i] + i) * 0.00008;
      }
      ptsGeo.attributes.position.needsUpdate = true;

      // Parallax smoothing
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (0.6 + targetY - camera.position.y) * 0.04;
    }

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
}
tick();