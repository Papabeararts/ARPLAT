// script.js
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/ARButton.js';

const canvas = document.getElementById('webgl-canvas');
const statusEl = document.getElementById('status');

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

// Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
scene.add(light);

// Reticle (surface indicator)
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x00e6a8, transparent: true, opacity: 0.85 })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

// Placeholder object (hidden until placement)
const placeholder = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.15, 0.15),
  new THREE.MeshStandardMaterial({ color: 0x4cc3d9, metalness: 0.1, roughness: 0.8 })
);
placeholder.visible = false;
scene.add(placeholder);

// Resize handling
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// AR setup with hit-test
let xrHitTestSource = null;
let viewerSpace = null;
let localSpace = null;

function onSessionStart(session) {
  session.addEventListener('end', onSessionEnd);
  statusEl.textContent = 'Move your phone to find a surface';

  renderer.xr.setSession(session);

  Promise.all([
    session.requestReferenceSpace('viewer').then(space => (viewerSpace = space)),
    session.requestReferenceSpace('local').then(space => (localSpace = space))
  ]).then(async () => {
    try {
      xrHitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    } catch (e) {
      console.error('Hit test not available', e);
      statusEl.textContent = 'Hit test not available on this device/browser';
    }
  });

  renderer.setAnimationLoop(render);
}

function onSessionEnd() {
  xrHitTestSource = null;
  viewerSpace = null;
  localSpace = null;
  reticle.visible = false;
  placeholder.visible = false;
  statusEl.textContent = 'AR session ended';
}

function render(_t, frame) {
  if (frame && xrHitTestSource && localSpace) {
    const hitTestResults = frame.getHitTestResults(xrHitTestSource);
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(localSpace);
      reticle.visible = true;
      reticle.matrix.fromArray(pose.transform.matrix);
      statusEl.textContent = 'Tap to place object';
    } else {
      reticle.visible = false;
      statusEl.textContent = 'Move your phone to find a surface';
    }
  }

  renderer.render(scene, camera);
}

// Tap-to-place
function placeObjectAtReticle() {
  if (!reticle.visible) return;
  placeholder.visible = true;
  placeholder.position.setFromMatrixPosition(reticle.matrix);
}

// Create AR Button and start session
function initAR() {
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body }
  });
  button.classList.add('ar-button');
  document.body.appendChild(button);

  renderer.xr.addEventListener('sessionstart', () => onSessionStart(renderer.xr.getSession()));
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  window.addEventListener('click', placeObjectAtReticle);
}

// Feature support check
async function checkSupport() {
  if (!('xr' in navigator)) {
    statusEl.textContent = 'WebXR not supported on this device/browser';
    return;
  }
  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    statusEl.textContent = 'AR not supported on this device/browser';
    return;
  }
  initAR();
}

checkSupport();