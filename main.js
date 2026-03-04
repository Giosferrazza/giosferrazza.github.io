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

/* ---------- Three.js: connected data points (black + green) ---------- */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = $("#scene");

// Basic device heuristics for performance
const isSmall = Math.min(window.innerWidth, window.innerHeight) < 720;
const isLowPower = isSmall || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

// Network sizing
const POINTS = isLowPower ? 110 : 200;
const MAX_LINKS_PER_POINT = isLowPower ? 3 : 3;
const CONNECT_DIST = isLowPower ? 1.20 : 1.35;
const BOX = { x: 6.8, y: 4.0, z: 6.2 }; // Size of Data Points

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

function setRendererSize(){
  const pr = Math.min(window.devicePixelRatio || 1, isLowPower ? 1.35 : 1.6);
  renderer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}
setRendererSize();

// Scene/camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0.2, 8.8);

// Lighting (kept subtle; points/lines are emissive-ish)
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const dir = new THREE.DirectionalLight(0xffffff, 0.35);
dir.position.set(3, 4, 2);
scene.add(dir);

// Colors
const GREEN = new THREE.Color(0x22c55e);
const GREEN_SOFT = new THREE.Color(0x86efac);

// Points data
const positions = new Float32Array(POINTS * 3);
const velocities = new Float32Array(POINTS * 3);

function rand(min, max){ return min + Math.random() * (max - min); }

// Initialize points in a loose 3D blob
for (let i = 0; i < POINTS; i++){
  const ix = i * 3;
  positions[ix + 0] = rand(-BOX.x/2, BOX.x/2);
  positions[ix + 1] = rand(-BOX.y/2, BOX.y/2);
  positions[ix + 2] = rand(-BOX.z/2, BOX.z/2);

  // gentle drift velocities
  velocities[ix + 0] = rand(-0.18, 0.18) * (isLowPower ? 0.55 : 0.7);
  velocities[ix + 1] = rand(-0.14, 0.14) * (isLowPower ? 0.55 : 0.7);
  velocities[ix + 2] = rand(-0.18, 0.18) * (isLowPower ? 0.55 : 0.7);
}

// Points geometry/material
const pointsGeo = new THREE.BufferGeometry();
pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const pointsMat = new THREE.PointsMaterial({
  color: GREEN_SOFT,
  size: isLowPower ? 0.045 : 0.04,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const pointsObj = new THREE.Points(pointsGeo, pointsMat);
scene.add(pointsObj);

// Lines geometry/material (dynamic)
const maxSegments = POINTS * MAX_LINKS_PER_POINT; // rough cap
const linePositions = new Float32Array(maxSegments * 2 * 3); // 2 endpoints per segment, 3 coords each
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
lineGeo.setDrawRange(0, 0);

const lineMat = new THREE.LineBasicMaterial({
  color: GREEN,
  transparent: true,
  opacity: isLowPower ? 0.20 : 0.18,
  blending: THREE.AdditiveBlending
});

const linesObj = new THREE.LineSegments(lineGeo, lineMat);
scene.add(linesObj);

// A faint “core” glow (optional but looks DS-ish)
const coreGeo = new THREE.SphereGeometry(0.18, 24, 24);
const coreMat = new THREE.MeshStandardMaterial({
  color: 0x050607,
  emissive: 0x0b3d1f,
  emissiveIntensity: 1.2,
  roughness: 0.6,
  metalness: 0.0
});
const core = new THREE.Mesh(coreGeo, coreMat);
scene.add(core);
// Scene Core made hidden
core.visible = false;

// Parallax
let targetX = 0, targetY = 0;
window.addEventListener("pointermove", (e) => {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = (e.clientY / window.innerHeight) * 2 - 1;
  targetX = x * 0.35;
  targetY = -y * 0.22;
}, { passive: true });

// Pause when hidden
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

// Helpers
function bounce(val, halfExtent, v){
  if (val > halfExtent) return { val: halfExtent, v: -Math.abs(v) };
  if (val < -halfExtent) return { val: -halfExtent, v: Math.abs(v) };
  return { val, v };
}

// Build connections: connect each point to up to K nearest neighbors within CONNECT_DIST
function rebuildLines(){
  const pos = pointsGeo.attributes.position.array;

  let write = 0;
  let segCount = 0;

  // For each point i, find nearest neighbors (brute force; fine for <= 160 points)
  for (let i = 0; i < POINTS; i++){
    const ix = i * 3;
    const ax = pos[ix + 0], ay = pos[ix + 1], az = pos[ix + 2];

    // track nearest candidates
    const best = []; // {j, d2}
    for (let j = i + 1; j < POINTS; j++){
      const jx = j * 3;
      const bx = pos[jx + 0], by = pos[jx + 1], bz = pos[jx + 2];
      const dx = ax - bx, dy = ay - by, dz = az - bz;
      const d2 = dx*dx + dy*dy + dz*dz;

      if (d2 <= CONNECT_DIST * CONNECT_DIST){
        best.push({ j, d2 });
      }
    }

    // sort by distance and keep K
    best.sort((a,b) => a.d2 - b.d2);
    const take = best.slice(0, MAX_LINKS_PER_POINT);

    for (const b of take){
      if (segCount >= maxSegments) break;

      const jx = b.j * 3;

      // A -> B
      linePositions[write++] = ax;
      linePositions[write++] = ay;
      linePositions[write++] = az;

      linePositions[write++] = pos[jx + 0];
      linePositions[write++] = pos[jx + 1];
      linePositions[write++] = pos[jx + 2];

      segCount++;
    }
  }

  lineGeo.setDrawRange(0, segCount * 2);
  lineGeo.attributes.position.needsUpdate = true;
}

// Animation
const clock = new THREE.Clock();

function tick(){
  if (running){
    const dt = Math.min(clock.getDelta(), 0.033); // clamp delta
    const t = clock.elapsedTime;

    if (!prefersReducedMotion){
      // Update points positions
      const pos = pointsGeo.attributes.position.array;
      for (let i = 0; i < POINTS; i++){
        const ix = i * 3;

        pos[ix + 0] += velocities[ix + 0] * dt;
        pos[ix + 1] += velocities[ix + 1] * dt;
        pos[ix + 2] += velocities[ix + 2] * dt;

        // subtle noise
        pos[ix + 1] += Math.sin(t * 0.6 + i) * (isLowPower ? 0.0006 : 0.0008);

        // bounce within box
        const bx = bounce(pos[ix + 0], BOX.x/2, velocities[ix + 0]);
        const by = bounce(pos[ix + 1], BOX.y/2, velocities[ix + 1]);
        const bz = bounce(pos[ix + 2], BOX.z/2, velocities[ix + 2]);
        pos[ix + 0] = bx.val; velocities[ix + 0] = bx.v;
        pos[ix + 1] = by.val; velocities[ix + 1] = by.v;
        pos[ix + 2] = bz.val; velocities[ix + 2] = bz.v;
      }
      pointsGeo.attributes.position.needsUpdate = true;

      // Rebuild connections (don’t do every frame on low power)
      const rebuildEvery = isLowPower ? 3 : 2;
      if (Math.floor(t * 60) % rebuildEvery === 0) rebuildLines();

      // Parallax
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (0.2 + targetY - camera.position.y) * 0.04;

      // Gentle camera breathing
      camera.position.z = 7.2 + Math.sin(t * 0.25) * 0.12;

      // core pulse
      core.material.emissiveIntensity = 1.0 + (Math.sin(t * 0.9) * 0.15);
    } else {
      // Reduced motion: build lines once, keep static
      rebuildLines();
    }

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  requestAnimationFrame(tick);
}

// Initial build
rebuildLines();
tick();