/**
 * HeroScene3D — Three.js + GSAP scrolling star-field scene.
 *
 * Renders a full-bleed WebGL canvas behind the hero text overlay.
 * The camera journeys through a dark landscape of stars and terrain
 * silhouettes as the user scrolls, driven by the same spring MotionValue
 * that animates the chapter counter — no second scroll listener needed.
 *
 * Bloom post-processing is enabled on desktop (≥768 px) when reduced
 * motion is not requested; the basic renderer path is used otherwise.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { useMotionValueEvent, useReducedMotion } from "motion/react";
import type { MotionValue } from "motion/react";

// ─── Star field ────────────────────────────────────────────────────────────

/**
 * mulberry32 — a small, well-distributed seeded PRNG.
 *
 * The previous generator was a plain LCG (state*1664525 + 1013904223). LCGs
 * famously fail the spectral test: consecutive outputs taken as tuples fall on
 * a small number of hyperplanes. Because each star consumes several values in
 * a row for radius, angle and elevation, the positions landed on a lattice —
 * and one of those planes sat edge-on to the camera, projecting as a bright
 * beaded line straight down the middle of the hero. Additive blending and
 * bloom then turned that line into the white column.
 */
function seededRandom(seed: number) {
  let state = (seed >>> 0) + 0x6d2b79f5;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds one depth layer of stars as a THREE.Points object.
 * Colors are biased toward Pathfind's warm cream + accent orange palette.
 */
/** Soft round sprite, drawn once and shared by every star. */
let starSprite: THREE.Texture | null = null;
function getStarSprite(): THREE.Texture {
  if (starSprite) return starSprite;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  starSprite = new THREE.CanvasTexture(c);
  starSprite.colorSpace = THREE.SRGBColorSpace;
  return starSprite;
}

/**
 * One depth layer of stars.
 *
 * This used to be a custom ShaderMaterial whose vertex stage scaled point size
 * by an unbounded 380/-z perspective term and rotated the field in-shader. On a
 * real GPU it rendered a hard vertical line of points through the middle of the
 * frame, which the bloom pass then turned into a glowing column — the "white
 * orb". It never appeared under software rendering, which is why it survived
 * several rounds of review.
 *
 * It is now a plain PointsMaterial with a soft sprite and size attenuation:
 * standard, bounded, and with no custom projection maths that can degenerate.
 * The slow rotation moved to the object's own transform in the render loop.
 */
function buildStarField(layerIndex: number, count = 1200): THREE.Points {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const random = seededRandom(90210 + layerIndex * 7919);
  const shell = layerIndex === 2 ? 420 : 760;

  for (let i = 0; i < count; i++) {
    // Uniform direction on the sphere, then a radius inside a thick shell.
    const cosPhi = 2 * random() - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const theta = random() * Math.PI * 2;
    const r = shell * (0.72 + random() * 0.28);

    pos[i * 3] = r * sinPhi * Math.cos(theta);
    pos[i * 3 + 1] = r * sinPhi * Math.sin(theta);
    pos[i * 3 + 2] = r * cosPhi;

    // White, blue-white, and a few warm stars. No brand colours.
    const roll = random();
    const c = new THREE.Color();
    if (roll < 0.74) c.setRGB(0.96, 0.95, 0.92);
    else if (roll < 0.94) c.setRGB(0.80, 0.87, 1.0);
    else c.setRGB(1.0, 0.86, 0.68);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    map: getStarSprite(),
    size: layerIndex === 2 ? 3.1 : 2.2,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: layerIndex === 2 ? 0.95 : 0.7,
  });

  return new THREE.Points(geo, mat);
}

// ─── Earth + launch vehicle ───────────────────────────────────────────────

function buildEarth(): THREE.Group {
  const earth = new THREE.Group();
  const surfaceGeometry = new THREE.SphereGeometry(31, 72, 52);
  const sharedVertexShader = /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vView;
    void main() {
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vView = normalize(-viewPosition.xyz);
      gl_Position = projectionMatrix * viewPosition;
    }
  `;

  const globe = new THREE.Mesh(
    surfaceGeometry,
    new THREE.ShaderMaterial({
      vertexShader: sharedVertexShader,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vView;

        float hash31(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        float valueNoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
                mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
        }

        float fbm(vec3 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int octave = 0; octave < 5; octave++) {
            value += valueNoise(p) * amplitude;
            p = p * 2.03 + vec3(4.2, 1.7, 9.3);
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          vec3 n = normalize(vNormal);
          vec3 sphere = normalize(vPosition);
          vec3 lightDir = normalize(vec3(-0.72, 0.62, 0.44));
          float diffuse = max(dot(n, lightDir), 0.0);
          float halfLight = dot(n, lightDir) * 0.5 + 0.5;

          float continental = fbm(sphere * 2.15 + vec3(0.6, 1.2, -0.4));
          continental += fbm(sphere.yzx * 4.3) * 0.28;
          float landMask = smoothstep(0.52, 0.61, continental);
          float detail = fbm(sphere * 13.0);
          float latitude = abs(sphere.y);
          float ice = smoothstep(0.70, 0.93, latitude + detail * 0.12);

          vec3 deepOcean = vec3(0.012, 0.105, 0.16);
          vec3 shelfOcean = vec3(0.025, 0.25, 0.31);
          vec3 ocean = mix(deepOcean, shelfOcean, smoothstep(0.38, 0.68, detail));
          vec3 lowland = vec3(0.16, 0.30, 0.18);
          vec3 highland = vec3(0.38, 0.39, 0.24);
          vec3 land = mix(lowland, highland, smoothstep(0.45, 0.78, detail));
          vec3 surface = mix(ocean, land, landMask);
          surface = mix(surface, vec3(0.76, 0.79, 0.73), ice * 0.78);

          float oceanSpec = pow(max(dot(reflect(-lightDir, n), normalize(vView)), 0.0), 30.0);
          oceanSpec *= (1.0 - landMask) * diffuse;
          float nightLights = step(0.86, hash31(floor(sphere * 72.0)));
          nightLights *= landMask * smoothstep(0.48, 0.0, halfLight) * (1.0 - ice);
          float limb = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 3.2);

          vec3 color = surface * (0.13 + diffuse * 1.12);
          color += vec3(0.36, 0.69, 0.72) * oceanSpec * 0.42;
          color += vec3(1.0, 0.58, 0.19) * nightLights * 1.7;
          color += vec3(0.02, 0.13, 0.17) * limb;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    }),
  );
  globe.name = "earth-surface";
  globe.rotation.z = -0.18;
  earth.add(globe);

  const cloudMaterial = new THREE.ShaderMaterial({
    vertexShader: sharedVertexShader,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vView;
      float cloudNoise(vec3 p) {
        return sin(p.x * 0.38 + sin(p.y * 0.24) * 2.2)
          + sin(p.z * 0.44 - p.y * 0.29)
          + sin((p.x - p.z) * 0.19) * 0.7;
      }
      void main() {
        vec3 lightDir = normalize(vec3(-0.72, 0.62, 0.44));
        float light = max(dot(normalize(vNormal), lightDir), 0.0);
        float cloud = smoothstep(1.15, 1.62, cloudNoise(vPosition));
        float edge = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.0);
        gl_FragColor = vec4(vec3(0.78, 0.85, 0.83) * (0.25 + light), cloud * 0.34 + edge * 0.035);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(31.34, 64, 44), cloudMaterial);
  clouds.name = "earth-clouds";
  clouds.rotation.z = -0.18;
  earth.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(32.25, 56, 40),
    new THREE.ShaderMaterial({
      vertexShader: sharedVertexShader,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
          float rim = pow(1.0 - facing, 2.5);
          float outer = pow(1.0 - facing, 5.5);
          vec3 color = mix(vec3(0.10, 0.45, 0.58), vec3(0.42, 0.84, 0.88), outer);
          gl_FragColor = vec4(color, rim * 0.38 + outer * 0.34);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  earth.add(atmosphere);
  return earth;
}

/**
 * Launch vehicle.
 *
 * The previous model read as a toy for one measurable reason: it was 8.6 units
 * tall on a 2.08 diameter — roughly 4:1, where a real orbital booster is closer
 * to 19:1 — and it carried cartoon signifiers (three swept fins, a porthole with
 * a chrome ring, a side hatch, a painted nose cone). This build is ~14:1 and
 * carries only hardware that exists on a real two-stage vehicle: an engine
 * octaweb, a sooted base, a composite interstage, stowed grid fins and an ogive
 * fairing. No element is here for decoration.
 */
function buildRocket(): THREE.Group {
  const rocket = new THREE.Group();

  const R = 0.36; // body radius — everything is proportioned off this

  // Real boosters are painted white but weather fast; the hull carries a little
  // roughness variation rather than reading as clean plastic.
  // Launch vehicles are painted white but weather quickly; a flat bright white
  // at low roughness is what makes a render look like moulded plastic.
  const hull = new THREE.MeshStandardMaterial({
    color: 0xcfcdc4,
    roughness: 0.78,
    metalness: 0.04,
  });
  const hullSooted = new THREE.MeshStandardMaterial({
    color: 0x6b6862,
    roughness: 0.9,
    metalness: 0.04,
  });
  const composite = new THREE.MeshStandardMaterial({
    color: 0x1d2328,
    roughness: 0.46,
    metalness: 0.34,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x6a7278,
    roughness: 0.28,
    metalness: 0.92,
  });

  const add = (mesh: THREE.Mesh, y: number) => {
    mesh.position.y = y;
    rocket.add(mesh);
    return mesh;
  };

  // ── Engine section (base at y = -3.2) ──────────────────────────────────
  add(new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.06, 0.5, 32), composite), -2.95);

  // Nine engines: one centre, eight on a ring — the octaweb layout.
  const bellGeo = new THREE.CylinderGeometry(0.055, 0.095, 0.3, 12, 1, true);
  const centreBell = new THREE.Mesh(bellGeo, metal);
  centreBell.position.y = -3.34;
  rocket.add(centreBell);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bell = new THREE.Mesh(bellGeo, metal);
    bell.position.set(Math.cos(a) * R * 0.62, -3.34, Math.sin(a) * R * 0.62);
    rocket.add(bell);
  }

  // ── First stage ────────────────────────────────────────────────────────
  add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 4.8, 32), hull), -0.3);
  // Soot wash where the plume washes back over the base after liftoff.
  add(new THREE.Mesh(new THREE.CylinderGeometry(R * 1.004, R * 1.004, 1.1, 32), hullSooted), -2.2);

  // Stowed grid fins — flat against the body near the top of the booster,
  // which is where they actually sit before entry burn.
  const finGeo = new THREE.BoxGeometry(0.26, 0.46, 0.045);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = new THREE.Mesh(finGeo, metal);
    fin.position.set(Math.cos(a) * (R + 0.02), 1.72, Math.sin(a) * (R + 0.02));
    fin.rotation.y = -a;
    rocket.add(fin);
  }

  // ── Interstage, second stage, fairing ──────────────────────────────────
  add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.9, 32), composite), 2.55);
  add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.8, 32), hull), 3.9);
  add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.6, 32), hull), 5.1);

  // Ogive nose rather than a straight cone: sampled from a quadratic profile so
  // the silhouette curves the way a real fairing does.
  const ogive: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    ogive.push(new THREE.Vector2(R * Math.cos((t * Math.PI) / 2) ** 0.62, t * 1.4));
  }
  const fairing = new THREE.Mesh(new THREE.LatheGeometry(ogive, 32), hull);
  fairing.position.y = 5.4;
  rocket.add(fairing);

  // ── Exhaust ────────────────────────────────────────────────────────────
  // Two solid cones read as a flat orange triangle. This is a shaded plume:
  // white-hot at the throat, cooling to orange, fading radially and along its
  // length so it has volume and an edge that dissolves instead of ending.
  const plumeMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIntensity;
      void main() {
        // The cone's wide end sits at the nozzle, so vUv.y = 1 is the throat.
        // t runs 0 at the throat to 1 at the tail.
        float t = 1.0 - vUv.y;
        // Flicker: combustion is not steady, but it is fast and small.
        float flick = 0.92 + 0.08 * sin(uTime * 41.0 + t * 9.0);
        vec3 hot  = vec3(1.0, 0.97, 0.90);   // white-hot at the throat
        vec3 warm = vec3(1.0, 0.42, 0.10);   // cooling to orange
        vec3 col = mix(hot, warm, smoothstep(0.0, 0.42, t));
        // Fade along length, and soften the rim so the cone has no hard edge.
        float along = pow(1.0 - t, 1.5);
        float rim = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        float a = along * (0.45 + 0.55 * rim) * flick * uIntensity;
        gl_FragColor = vec4(col * (1.1 + 0.9 * along), a);
      }
    `,
  });

  const plume = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.1, 5.2, 24, 1, true),
    plumeMaterial,
  );
  plume.name = "rocket-flame";
  plume.position.y = -6.0;
  rocket.add(plume);

  // A short, very bright throat keeps the engine end from washing out.
  const hotCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.05, 1.5, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff4de,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  hotCore.name = "rocket-flame-core";
  hotCore.position.y = -4.2;
  rocket.add(hotCore);

  // The engines light the vehicle from below — the cue that sells scale.
  const exhaustLight = new THREE.PointLight(0xff7a33, 6.5, 22, 2);
  exhaustLight.position.y = -3.6;
  rocket.add(exhaustLight);

  return rocket;
}

// ─── Component ─────────────────────────────────────────────────────────────

interface HeroScene3DProps {
  cameraProgress: MotionValue<number>;
}

export default function HeroScene3D({ cameraProgress }: HeroScene3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mutable ref so the RAF loop reads the latest value without React re-renders.
  const progressRef = useRef(0);
  const reducedMotion = useReducedMotion();

  // Track the spring-smoothed scroll progress.
  useMotionValueEvent(cameraProgress, "change", (v) => {
    progressRef.current = v;
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // ── Scene ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050d11);
    scene.fog = new THREE.FogExp2(0x050d11, 0.00042);
    // Ambient was doing most of the work at 1.7, which lit the booster evenly
    // from every side — the single biggest reason it read as moulded plastic.
    // A real vehicle in orbit has one sun and a hard terminator, so the fill is
    // cut right back and a cool rim light separates the dark side from space.
    scene.add(new THREE.HemisphereLight(0x7fa6b4, 0x05090c, 0.42));
    const keyLight = new THREE.DirectionalLight(0xfff0d8, 5.4);
    keyLight.position.set(-40, 65, 55);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9fc4d8, 1.15);
    rimLight.position.set(70, 10, -60);
    scene.add(rimLight);

    // ── Camera ─────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(68, W / H, 0.5, 2200);
    camera.position.set(0, 24, 170);

    // ── Renderer ───────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !reducedMotion,
      powerPreference: "high-performance",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    // Reinhard is gentler on additive-blended stars than ACES filmic.
    // The OutputPass in the bloom pipeline handles tonemapping for that path.
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.15;

    // ── Stars ──────────────────────────────────────────────────────────
    // Three layers: far background (0), mid (1), close foreground (2).
    // Layer 2 uses fewer but larger stars for a depth-of-field feel.
    // A real star field, in three parallax depths. The original 13,800 points
    // in five brand colours read as confetti; this is about a third of that in
    // a stellar palette, which fills the sky without competing with the copy.
    const starFields = [
      buildStarField(0, W < 768 ? 1500 : 2300),
      buildStarField(1, W < 768 ? 1100 : 1700),
      buildStarField(2, W < 768 ? 520 : 800),
    ];
    starFields.forEach((sf) => scene.add(sf));

    // The three nebula billboards are gone. They were large tinted planes that
    // rendered as an unexplained diagonal wash across the middle of the frame —
    // atmosphere for its own sake, and the single most arbitrary thing on screen.

    // Terrain silhouettes and the wide horizon glow band are gone. The camera is
    // looking at a planet limb from orbit: a ridgeline across the bottom of the
    // frame and a straight light band across the middle both contradicted that,
    // and the band was the unexplained beam cutting the composition in half.
    // The planet's own atmosphere ring is the only horizon this view needs.

    // ── Camera-relative Earth and rocket ────────────────────────────────
    // Anchoring this rig to the camera keeps the launch in a dedicated
    // right-side corridor, safely away from the hero copy at every keyframe.
    const foregroundRig = new THREE.Group();
    camera.add(foregroundRig);
    scene.add(camera);
    const earth = buildEarth();
    const rocket = buildRocket();
    foregroundRig.add(earth, rocket);
    const flame = rocket.getObjectByName("rocket-flame") as THREE.Mesh;
    const flameCore = rocket.getObjectByName("rocket-flame-core") as THREE.Mesh;
    // The plume is a shader now: intensity is a uniform, and uTime drives the
    // combustion flicker inside the fragment shader rather than by opacity.
    const flameMaterial = flame.material as THREE.ShaderMaterial;
    const flameCoreMaterial = flameCore.material as THREE.MeshBasicMaterial;
    const clouds = earth.getObjectByName("earth-clouds") as THREE.Mesh;
    const launchCurve = new THREE.CatmullRomCurve3([
      // Shortened: the vehicle climbs a little over a frame height rather than
      // flying entirely out of shot, so the sequence ends on a composition
      // instead of on an empty sky.
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-1.1, 7, 0.5),
      new THREE.Vector3(-1.9, 15, 0),
      new THREE.Vector3(-0.4, 23, -0.8),
    ]);
    const tangent = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    const layoutForeground = (width: number, height: number) => {
      const mobile = width < 800;
      const depth = 54;
      const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth;
      const halfWidth = halfHeight * (width / height);
      // The planet was reading as a co-lead with the rocket. Pushed further
      // down and out so only a limb and its atmosphere remain in frame: it is
      // context for the launch, not a second subject.
      earth.position.set(
        mobile ? halfWidth * 1.12 : halfWidth * 1.04,
        mobile ? -halfHeight * 1.58 : -halfHeight * 1.66,
        -depth,
      );
      earth.scale.setScalar(mobile ? 0.72 : 0.92);
      // Brought in off the corner and up into frame: with the planet pushed
      // back, the vehicle is the scene's subject and needs the room to read.
      rocket.position.set(
        mobile ? halfWidth * 0.58 : halfWidth * 0.62,
        mobile ? -halfHeight * 0.58 : -halfHeight * 0.42,
        -depth + 8,
      );
      rocket.scale.setScalar(mobile ? 1.12 : 1.72);
      rocket.userData.launchOffsetX = 0;
      rocket.userData.launchOffsetY = 0;
      rocket.userData.launchOffsetZ = 0;
    };
    layoutForeground(W, H);

    // ── Post-processing (desktop, non-reduced-motion only) ─────────────
    let composer: EffectComposer | null = null;
    if (W >= 768 && !reducedMotion) {
      try {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(
          new UnrealBloomPass(
            new THREE.Vector2(W, H),
            // Gentler than before: bloom should suggest atmosphere around the
            // engines, not smear every bright pixel into a halo.
            0.32,
            0.22,
            0.85,
          ),
        );
        // OutputPass applies the renderer's tonemapping + colour space
        // conversion on the composer's final output, which UnrealBloomPass
        // alone does not do in Three.js r150+.
        composer.addPass(new OutputPass());
      } catch {
        // Silently fall back to basic renderer on devices that reject it.
        composer = null;
      }
    }

    // ── Camera path keyframes (progress 0 → 1) ─────────────────────────
    // The journey: from a wide view across the dark horizon → deep within
    // a field of stars, mountains receding below frame.
    const CAM = [
      { px: 0,  py: 24, pz: 170,  lx: 0, ly: 10, lz: -80  },
      { px: -4, py: 29, pz: 82,   lx: 0, ly: 10, lz: -104 },
      { px: 3,  py: 35, pz: -12,  lx: 0, ly: 11, lz: -144 },
      { px: 0,  py: 41, pz: -115, lx: 0, ly: 12, lz: -210 },
    ];

    const interpolateCam = (p: number) => {
      const seg = Math.min(p, 0.9999) * (CAM.length - 1);
      const i = Math.floor(seg);
      const t = seg - i;
      const a = CAM[i], b = CAM[i + 1] ?? a;
      return {
        px: a.px + (b.px - a.px) * t,
        py: a.py + (b.py - a.py) * t,
        pz: a.pz + (b.pz - a.pz) * t,
        lx: a.lx + (b.lx - a.lx) * t,
        ly: a.ly + (b.ly - a.ly) * t,
        lz: a.lz + (b.lz - a.lz) * t,
      };
    };

    // Smooth state — interpolated toward the target each frame.
    const sm = { px: 0, py: 24, pz: 170, lx: 0, ly: 10, lz: -80 };
    const lookTarget = new THREE.Vector3();
    const EASE = 0.036; // Lower = smoother / slower tracking.

    // ── Animation loop ─────────────────────────────────────────────────
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      const p = progressRef.current;

      // Interpolate camera target from scroll progress.
      const tgt = interpolateCam(p);

      // Exponential smoothing toward target.
      sm.px += (tgt.px - sm.px) * EASE;
      sm.py += (tgt.py - sm.py) * EASE;
      sm.pz += (tgt.pz - sm.pz) * EASE;
      sm.lx += (tgt.lx - sm.lx) * EASE;
      sm.ly += (tgt.ly - sm.ly) * EASE;
      sm.lz += (tgt.lz - sm.lz) * EASE;

      // Subtle organic drift (disabled under reducedMotion).
      const fx = reducedMotion ? 0 : Math.sin(t * 0.068) * 1.7;
      const fy = reducedMotion ? 0 : Math.cos(t * 0.107) * 0.85;

      camera.position.set(sm.px + fx, sm.py + fy, sm.pz);
      lookTarget.set(sm.lx, sm.ly, sm.lz);
      camera.lookAt(lookTarget);

      // Star field slow rotation.
      starFields.forEach((sf, idx) => {
        // Rotation lives on the transform now that the material is standard.
        sf.rotation.z = t * 0.011 * (0.45 + idx * 0.55);
      });


      // Earth turns subtly while the rocket launches across all four chapters.
      earth.rotation.y = p * 0.24;
      if (!reducedMotion) clouds.rotation.y = t * 0.012 - p * 0.08;
      // Stage one holds the vehicle on the pad with engines lit; the ascent is
      // stage two, so the whole climb lands inside the second scroll gesture.
      const launch = THREE.MathUtils.smoothstep(p, 0.30, 0.98);
      const launchPoint = launchCurve.getPoint(launch);
      const baseX = rocket.position.x - (rocket.userData.launchOffsetX ?? 0);
      const baseY = rocket.position.y - (rocket.userData.launchOffsetY ?? 0);
      const baseZ = rocket.position.z - (rocket.userData.launchOffsetZ ?? 0);
      rocket.userData.launchOffsetX = launchPoint.x;
      rocket.userData.launchOffsetY = launchPoint.y;
      rocket.userData.launchOffsetZ = launchPoint.z;
      rocket.position.set(baseX + launchPoint.x, baseY + launchPoint.y, baseZ + launchPoint.z);
      launchCurve.getTangent(Math.min(launch + 0.002, 1), tangent).normalize();
      rocket.quaternion.setFromUnitVectors(up, tangent);
      const flicker = reducedMotion ? 1 : 0.92 + Math.sin(t * 24) * 0.08;
      flameMaterial.uniforms.uTime.value = t;
      flameMaterial.uniforms.uIntensity.value = reducedMotion ? 0.5 : 0.3 + launch * 0.7;
      flameCoreMaterial.opacity = reducedMotion ? 0.82 : (0.7 + launch * 0.26) * flicker;
      // Throttle-up reads as the plume lengthening and widening together.
      flame.scale.set(
        reducedMotion ? 0.9 : 0.72 + launch * 0.4,
        reducedMotion ? 0.7 : 0.5 + launch * 0.9,
        reducedMotion ? 0.9 : 0.72 + launch * 0.4,
      );
      flameCore.scale.y = reducedMotion ? 0.74 : 0.72 + launch * 0.36;

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animate();

    // ── Resize ─────────────────────────────────────────────────────────
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
      layoutForeground(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Cleanup ────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mat = obj.material as THREE.Material;
          mat.dispose();
        }
      });

      composer?.dispose();
      renderer.dispose();
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="hero-3d-canvas"
      aria-hidden="true"
    />
  );
}
