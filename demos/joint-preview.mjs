import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  KNEE_JOINT,
  KNEE_PRESETS,
  sampleJoint,
} from "./native-joints/index.ts";

// This homepage view samples simLAB's existing authored flexion preset. It does
// not create a new motion, patient finding, clinical measure or assessment.
const FLEXION = KNEE_PRESETS.find((preset) => preset.id === "flexion");
const CONTROLS = {
  femur: "FemurControl",
  tibia: "TibiaControl",
  patella: "PatellaControl",
};
const BONE_NAMES = new Set(["Femur", "Tibia", "Fibula", "Patella"]);
const instances = new WeakMap();

/** Locate a requested angle on the native preset's forward movement segment.
 * All resulting positions/rotations still come from the actual native sampler.
 */
export function kneeStateAtAngle(requested) {
  const [minimum, maximum] = KNEE_JOINT.coordinates.find(
    (item) => item.id === "flexion",
  ).bounds;
  const angle = THREE.MathUtils.clamp(
    Number.isFinite(Number(requested)) ? Number(requested) : minimum,
    minimum,
    maximum,
  );
  if (angle === minimum) return sampleJoint(KNEE_JOINT, FLEXION, 0, 1, "R");
  if (angle === maximum)
    return sampleJoint(KNEE_JOINT, FLEXION, FLEXION.durationMs * 0.45, 1, "R");
  let low = FLEXION.durationMs * 0.15,
    high = FLEXION.durationMs * 0.45;
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2;
    if (sampleJoint(KNEE_JOINT, FLEXION, middle, 1, "R").angleDeg < angle)
      low = middle;
    else high = middle;
  }
  return sampleJoint(KNEE_JOINT, FLEXION, (low + high) / 2, 1, "R");
}

function release(root) {
  const geometry = new Set(),
    materials = new Set(),
    textures = new Set();
  root?.traverse((object) => {
    if (object.geometry) geometry.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value?.isTexture) textures.add(value);
    }
  });
  geometry.forEach((value) => value.dispose());
  materials.forEach((value) => value.dispose());
  textures.forEach((value) => {
    value.dispose();
    value.source?.data?.close?.();
  });
}

/** Call after the explicit Load button dynamically imports this module.
 * The returned destroy() releases resources. Calling twice shares one load.
 */
export async function mountKneePreview(root, options = {}) {
  if (instances.has(root)) return instances.get(root);
  const pending = createPreview(root, options).catch((error) => {
    instances.delete(root);
    throw error;
  });
  instances.set(root, pending);
  return pending;
}

export const mountJointPreview = mountKneePreview;

async function createPreview(root, options) {
  const viewport = root.querySelector("[data-joint-viewport]");
  const slider = root.querySelector("[data-joint-angle]");
  const output = root.querySelector("[data-joint-output]");
  const status = root.querySelector("[data-joint-status], .joint-load-status");
  const loadButton = root.querySelector("[data-joint-load], [data-load-joint]");
  const buttons = [...root.querySelectorAll("[data-joint-camera]")];
  if (!viewport || !slider || !output || !status)
    throw new Error("The joint preview is missing its viewport or controls.");
  let renderer,
    controls,
    model,
    resizeObserver,
    intersectionObserver,
    raf = 0,
    disposed = false,
    visible = true;
  let width = 0,
    height = 0,
    fitted = false;
  const abort = new AbortController(),
    cleanupEvents = [];
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
  const segments = new Map();
  const envelope = new THREE.Box3(),
    sphere = new THREE.Sphere();
  const setEnabled = (enabled) => {
    slider.disabled = !enabled;
    buttons.forEach((button) => {
      button.disabled = !enabled;
    });
  };
  const listen = (element, event, fn, settings) => {
    element.addEventListener(event, fn, settings);
    cleanupEvents.push(() => element.removeEventListener(event, fn, settings));
  };
  const requestRender = () => {
    if (disposed || !visible || document.hidden || raf || !renderer) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!disposed && visible && !document.hidden && width && height)
        renderer.render(scene, camera);
    });
  };
  function applyAngle(value) {
    const state = kneeStateAtAngle(value);
    for (const [id, object] of segments) {
      const transform = state.segments[id];
      object.quaternion.fromArray(transform.quaternion);
      object.position.fromArray(transform.translationM);
    }
    model.updateMatrixWorld(true);
    output.value = `${Math.round(state.angleDeg)}°`;
    output.textContent = output.value;
    slider.setAttribute(
      "aria-valuetext",
      `${Math.round(state.angleDeg)} degrees of illustrative knee flexion`,
    );
    viewport.dataset.angle = String(state.angleDeg);
    viewport.dataset.segmentState = JSON.stringify(state.segments);
    requestRender();
  }
  function frame() {
    if (!model || !width || !height) return;
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const distance =
      (sphere.radius / Math.sin(Math.min(vertical, horizontal))) * 1.12;
    controls.target.copy(sphere.center);
    // The native knee binding's three-quarter view direction.
    camera.position
      .copy(sphere.center)
      .addScaledVector(
        new THREE.Vector3(-0.28, 0.12, 0.38).normalize(),
        distance,
      );
    controls.minDistance = Math.max(0.15, sphere.radius * 0.7);
    controls.maxDistance = distance * 3;
    camera.near = 0.01;
    camera.far = Math.max(20, controls.maxDistance * 3);
    camera.updateProjectionMatrix();
    controls.update();
    fitted = true;
    requestRender();
  }
  function resize() {
    if (!renderer) return;
    const nextWidth = Math.round(viewport.clientWidth),
      nextHeight = Math.round(viewport.clientHeight);
    if (
      !nextWidth ||
      !nextHeight ||
      (width === nextWidth && height === nextHeight)
    )
      return;
    width = nextWidth;
    height = nextHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    frame();
    requestRender();
  }
  function step(action) {
    if (action === "reset") {
      frame();
      return;
    }
    const offset = camera.position.clone().sub(controls.target);
    const position = new THREE.Spherical().setFromVector3(offset);
    if (action === "left") position.theta -= Math.PI / 12;
    else if (action === "right") position.theta += Math.PI / 12;
    else if (action === "up")
      position.phi = Math.max(0.08, position.phi - Math.PI / 18);
    else if (action === "down")
      position.phi = Math.min(Math.PI - 0.08, position.phi + Math.PI / 18);
    else if (action === "zoom-in")
      position.radius = Math.max(controls.minDistance, position.radius * 0.8);
    else if (action === "zoom-out")
      position.radius = Math.min(controls.maxDistance, position.radius * 1.25);
    else return;
    camera.position
      .copy(controls.target)
      .add(new THREE.Vector3().setFromSpherical(position));
    controls.update();
    requestRender();
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    abort.abort();
    cancelAnimationFrame(raf);
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    cleanupEvents.forEach((fn) => fn());
    controls?.dispose();
    release(model);
    renderer?.dispose();
    renderer?.domElement.remove();
    instances.delete(root);
  }
  root.dataset.jointState = "loading";
  setEnabled(false);
  status.textContent = "Loading the simLAB knee model…";
  if (loadButton) loadButton.disabled = true;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x142b28);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive right knee anatomy. Arrow keys rotate; plus and minus zoom; Home resets.",
    );
    viewport.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.75;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    controls.addEventListener("change", requestRender);
    scene.add(
      new THREE.AmbientLight(0xffffff, 0.35),
      new THREE.HemisphereLight(0xffffff, 0x53655d, 1.1),
    );
    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc6e6e3, 1.1);
    fill.position.set(3, 1, -4);
    scene.add(fill);
    const url = new URL(
      options.modelUrl || root.dataset.jointModel || "./knee.glb",
      options.modelUrl || root.dataset.jointModel
        ? window.location.href
        : import.meta.url,
    );
    const timer = setTimeout(() => abort.abort(), 20000);
    let data;
    try {
      const response = await fetch(url, {
        signal: abort.signal,
        credentials: "omit",
      });
      if (!response.ok)
        throw new Error(`Model request returned ${response.status}.`);
      data = await response.arrayBuffer();
    } finally {
      clearTimeout(timer);
    }
    const gltf = await new GLTFLoader().parseAsync(
      data,
      new URL(".", url).href,
    );
    model = gltf.scene;
    if (!root.isConnected || disposed) {
      destroy();
      throw new Error("The preview was closed before the model loaded.");
    }
    scene.add(model);
    for (const [id, name] of Object.entries(CONTROLS)) {
      const object = model.getObjectByName(name);
      if (!object) throw new Error(`The native model is missing ${name}.`);
      segments.set(id, object);
    }
    // Match the native Joint Lab's default bones-only presentation. Soft tissue
    // is hidden because this small preview does not apply capsule deformation.
    const oldMaterials = new Set(),
      oldTextures = new Set();
    model.traverse((object) => {
      if (!object.isMesh) return;
      for (const material of [object.material].flat()) {
        oldMaterials.add(material);
        for (const value of Object.values(material))
          if (value?.isTexture) oldTextures.add(value);
      }
      object.visible = BONE_NAMES.has(object.name);
      object.material = new THREE.MeshStandardMaterial({
        color: object.name === "Patella" ? 0xe9cf9e : 0xf1e8d2,
        roughness: 0.82,
        side: THREE.DoubleSide,
      });
    });
    oldMaterials.forEach((material) => material.dispose());
    oldTextures.forEach((texture) => {
      texture.dispose();
      texture.source?.data?.close?.();
    });
    for (const angle of [0, 15, 30, 45, 60, 75, 90]) {
      applyAngle(angle);
      model.traverse((object) => {
        if (object.isMesh && object.visible) envelope.expandByObject(object);
      });
    }
    envelope.getBoundingSphere(sphere);
    applyAngle(slider.value);
    resize();
    if (!fitted) frame();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting !== false;
        if (visible) requestRender();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(root);
    listen(document, "visibilitychange", requestRender);
    listen(slider, "input", () => applyAngle(slider.value));
    for (const button of buttons)
      listen(button, "click", () => step(button.dataset.jointCamera));
    listen(renderer.domElement, "keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const action = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        "+": "zoom-in",
        "=": "zoom-in",
        "-": "zoom-out",
        Home: "reset",
      }[event.key];
      if (action) {
        event.preventDefault();
        step(action);
      }
    });
    listen(renderer.domElement, "webglcontextlost", (event) => {
      event.preventDefault();
      destroy();
      root.dataset.jointState = "error";
      setEnabled(false);
      status.textContent =
        "The 3D view paused on this device. Reload the model, or explore the full Movement Lab.";
      if (loadButton) {
        loadButton.disabled = false;
        loadButton.hidden = false;
        loadButton.textContent = "Reload 3D model";
      }
    });
    root.dataset.jointState = "ready";
    setEnabled(true);
    if (loadButton) loadButton.hidden = true;
    status.textContent =
      "Drag to rotate. Change the angle to see the bones move together.";
    return {
      destroy,
      setAngle(value) {
        slider.value = String(THREE.MathUtils.clamp(value, 0, 90));
        applyAngle(slider.value);
      },
      reset: frame,
    };
  } catch (error) {
    destroy();
    root.dataset.jointState = "error";
    setEnabled(false);
    status.textContent =
      "The 3D model could not load on this device. The Movement Lab in simLAB has the complete demonstration.";
    if (loadButton) {
      loadButton.disabled = false;
      loadButton.hidden = false;
      loadButton.textContent = "Try loading again";
    }
    throw error;
  }
}
