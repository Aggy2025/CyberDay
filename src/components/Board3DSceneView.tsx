import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Layers, RotateCcw } from 'lucide-react';
import { computeAccelMagnitude, computeGyroMagnitude } from '../lib/cyberEngine';
import type { SecurityThresholds, TelemetryPacket } from '../lib/types';

interface Board3DSceneViewProps {
  latestPacket: TelemetryPacket;
  matrixPixels: number[];
  thresholds: SecurityThresholds;
}

type CameraPreset = 'iso' | 'top' | 'sensors' | 'back';

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  iso: { pos: [1.75, 3.45, 4.15], target: [0.42, 0.25, 0.1] },
  top: { pos: [0.44, 5.75, 0.52], target: [0.44, 0.25, 0.2] },
  sensors: { pos: [-0.55, 1.85, 1.35], target: [-0.5, 0.42, -0.78] },
  back: { pos: [-0.35, -3.3, 2.75], target: [-0.2, 0.22, 0.1] },
};

// Pre-allocated math scratch objects outside render loop
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

/**
 * Crea la silueta oficial de la IdeaSense Explorer:
 * PCB vertical negro mate con 4 orejas de montaje redondeadas en las esquinas
 * y sus 4 perforaciones M3 metalizadas.
 */
function createIdeaSenseSilhouetteShape(includeHoles: boolean): THREE.Shape {
  const hw = 1.04; // half width body
  const earX = 1.38; // outer X of corner mounting ears
  const hd = 1.38; // half depth (vertical portrait height)
  const earStartZ = 0.88; // Z coordinate where corner ears flare out
  const r = 0.14;

  const s = new THREE.Shape();
  // Start top edge left of top-left ear
  s.moveTo(-earX + r, -hd);
  s.lineTo(earX - r, -hd);
  s.quadraticCurveTo(earX, -hd, earX, -hd + r);
  // Down right side of top-right ear
  s.lineTo(earX, -earStartZ - r);
  s.quadraticCurveTo(earX, -earStartZ, earX - r, -earStartZ);
  s.lineTo(hw + r * 0.4, -earStartZ);
  s.quadraticCurveTo(hw, -earStartZ, hw, -earStartZ + r * 0.6);
  // Straight down right body edge
  s.lineTo(hw, earStartZ - r * 0.6);
  // Out into bottom-right ear
  s.quadraticCurveTo(hw, earStartZ, hw + r * 0.4, earStartZ);
  s.lineTo(earX - r, earStartZ);
  s.quadraticCurveTo(earX, earStartZ, earX, earStartZ + r);
  s.lineTo(earX, hd - r);
  s.quadraticCurveTo(earX, hd, earX - r, hd);
  // Bottom edge
  s.lineTo(-earX + r, hd);
  s.quadraticCurveTo(-earX, hd, -earX, hd - r);
  // Up left side of bottom-left ear
  s.lineTo(-earX, earStartZ + r);
  s.quadraticCurveTo(-earX, earStartZ, -earX + r, earStartZ);
  s.lineTo(-hw - r * 0.4, earStartZ);
  s.quadraticCurveTo(-hw, earStartZ, -hw, earStartZ - r * 0.6);
  // Straight up left body edge
  s.lineTo(-hw, -earStartZ + r * 0.6);
  // Out into top-left ear
  s.quadraticCurveTo(-hw, -earStartZ, -hw - r * 0.4, -earStartZ);
  s.lineTo(-earX + r, -earStartZ);
  s.quadraticCurveTo(-earX, -earStartZ, -earX, -earStartZ - r);
  s.lineTo(-earX, -hd + r);
  s.quadraticCurveTo(-earX, -hd, -earX + r, -hd);

  if (includeHoles) {
    const holeOffsets: [number, number][] = [
      [-1.16, -1.16],
      [1.16, -1.16],
      [-1.16, 1.16],
      [1.16, 1.16],
    ];
    for (const [hx, hz] of holeOffsets) {
      const hole = new THREE.Path();
      hole.absarc(hx, hz, 0.085, 0, Math.PI * 2, true);
      s.holes.push(hole);
    }
  }
  return s;
}

/**
 * Textura serigrafiada FRONTAL fiel a images/IdeaSense.png:
 * negro mate, trazas sutiles, etiquetas "L", ejes "Y ↑ X → Z ⊙", "T/H",
 * textos verticales "Explorer" (izq) e "ideaSense" (der), y botones "A B C".
 */
function createIdeaSenseFrontTexture(): THREE.CanvasTexture {
  const w = 768;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Matte black solder mask
  ctx.fillStyle = '#14161b';
  ctx.fillRect(0, 0, w, h);

  // Helper converting board world coords x∈[-1.38,1.38], z∈[-1.38,1.38] to canvas px
  const bx = (wx: number) => ((wx + 1.38) / 2.76) * w;
  const bz = (wz: number) => ((wz + 1.38) / 2.76) * h;

  // Gold plated M3 annular pads baked cleanly into solder mask (zero z-fighting)
  const earCoords: [number, number][] = [
    [-1.16, -1.16],
    [1.16, -1.16],
    [-1.16, 1.16],
    [1.16, 1.16],
  ];
  for (const [ex, ez] of earCoords) {
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(bx(ex), bz(ez), 32, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Subtle dark copper PCB traces
  ctx.strokeStyle = '#1f242d';
  ctx.lineWidth = 3;
  for (let i = -0.62; i <= 0.62; i += 0.1) {
    ctx.beginPath();
    ctx.moveTo(bx(i), bz(-0.52));
    ctx.lineTo(bx(i), bz(0.9));
    ctx.stroke();
  }
  for (let i = -0.2; i <= 0.72; i += 0.16) {
    ctx.beginPath();
    ctx.moveTo(bx(-0.75), bz(i));
    ctx.lineTo(bx(0.75), bz(i));
    ctx.stroke();
  }

  // White silkscreen: Top sensor labels ("L", "Y/X/Z" triad, "T/H")
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#f8fafc';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "L" label beside LTR-303 optical sensor
  ctx.fillText('L', bx(-0.62), bz(-1.18));

  // "Y" above arrow + IMU triad (Y up, X right, Z dot-circle)
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Y', bx(-0.18), bz(-1.25));
  // Y arrow
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bx(-0.18), bz(-0.98));
  ctx.lineTo(bx(-0.18), bz(-1.12));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx(-0.22), bz(-1.08));
  ctx.lineTo(bx(-0.18), bz(-1.14));
  ctx.lineTo(bx(-0.14), bz(-1.08));
  ctx.stroke();

  // Z circle + dot
  ctx.beginPath();
  ctx.arc(bx(-0.18), bz(-0.93), 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx(-0.18), bz(-0.93), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Z', bx(-0.3), bz(-0.93));

  // X arrow + X label
  ctx.beginPath();
  ctx.moveTo(bx(-0.11), bz(-0.93));
  ctx.lineTo(bx(0.06), bz(-0.93));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx(0.02), bz(-0.97));
  ctx.lineTo(bx(0.08), bz(-0.93));
  ctx.lineTo(bx(0.02), bz(-0.89));
  ctx.stroke();
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('X', bx(0.16), bz(-0.93));

  // "T/H" label beside SHT30
  ctx.font = 'bold 25px sans-serif';
  ctx.fillText('T/H', bx(0.35), bz(-1.18));

  // Silver solder pads for 5x5 LED matrix footprint
  ctx.fillStyle = '#94a3b8';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const lx = -0.38 + col * 0.19;
      const lz = 0.0 + row * 0.19;
      ctx.fillRect(bx(lx) - 10, bz(lz) - 14, 20, 4);
      ctx.fillRect(bx(lx) - 10, bz(lz) + 10, 20, 4);
    }
  }

  // Vertical italic silkscreen "Explorer" (left) and "ideaSense" (right)
  ctx.save();
  ctx.translate(bx(-0.74), bz(0.38));
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'italic bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Explorer', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(bx(0.74), bz(0.36));
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'italic bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ideaSense', 0, 0);
  ctx.restore();

  // Serial / batch silkscreen line below 5x5 matrix
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('086796260386649903', bx(0), bz(0.95));

  // Bottom tactile button silkscreen labels: A, B, C
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('A', bx(-0.42), bz(1.27));
  ctx.fillText('B', bx(0.0), bz(1.27));
  ctx.fillText('C', bx(0.42), bz(1.27));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Textura serigrafiada TRASERA fiel a images/IdeaSense.png (Back):
 * "CRCibernetica IdeaSense Explorer", código QR blanco/negro y "Universidad CENFOTEC".
 */
function createIdeaSenseBackTexture(): THREE.CanvasTexture {
  const w = 768;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#14161b';
  ctx.fillRect(0, 0, w, h);

  const bpx = (wx: number) => ((wx + 1.38) / 2.76) * w;
  const bpz = (wz: number) => ((wz + 1.38) / 2.76) * h;
  const backEarCoords: [number, number][] = [
    [-1.16, -1.16],
    [1.16, -1.16],
    [-1.16, 1.16],
    [1.16, 1.16],
  ];
  for (const [ex, ez] of backEarCoords) {
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(bpx(ex), bpz(ez), 32, 0, Math.PI * 2);
    ctx.stroke();
  }

  const cx = w / 2;
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('CRCibernetica', cx, 118);
  ctx.font = 'italic bold 40px sans-serif';
  ctx.fillText('IdeaSense', cx, 162);
  ctx.font = 'italic bold 28px sans-serif';
  ctx.fillText('Explorer', cx, 198);

  // Authentic QR block matrix in center
  const qrSize = 230;
  const qrX = cx - qrSize / 2;
  const qrY = 238;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(qrX, qrY, qrSize, qrSize);
  const cells = 15;
  const step = qrSize / cells;
  ctx.fillStyle = '#14161b';
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const inFinder =
        (r < 4 && c < 4) || (r < 4 && c >= cells - 4) || (r >= cells - 4 && c < 4);
      if (inFinder) {
        const edge =
          r === 0 || c === 0 || r === 3 || c === 3 || c === cells - 4 || c === cells - 1 || r === cells - 4 || r === cells - 1;
        const inner = (r === 1 || r === 2) && (c === 1 || c === 2 || (c >= cells - 3 && c <= cells - 2));
        const innerBL = (r >= cells - 3 && r <= cells - 2) && (c === 1 || c === 2);
        if (edge || inner || innerBL) {
          ctx.fillRect(qrX + c * step + 1, qrY + r * step + 1, step - 2, step - 2);
        }
      } else if (((r * 7 + c * 13 + r * c) % 5) < 2) {
        ctx.fillRect(qrX + c * step + 1, qrY + r * step + 1, step - 2, step - 2);
      }
    }
  }

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Universidad', cx, 558);
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('CENFOTEC', cx, 598);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('SOMOS LO QUE SABEMOS', cx, 622);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Serigrafía fiel de la IdeaBoard (CRCibernética ESP32):
 * PCB negro mate horizontal, 4 anillos M3 plateados en esquinas,
 * "CRCibernética", "Vin - +", "PWR", "BOOT", "RESET", "IO02", "MOTOR 2", "Qwiic" y etiquetas GPIO.
 */
function createIdeaBoardTexture(): THREE.CanvasTexture {
  const w = 768;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#14161b';
  ctx.fillRect(0, 0, w, h);

  // Convert local IdeaBoard coords x∈[-0.975, 0.975], z∈[-0.66, 0.66] to canvas px
  const ix = (wx: number) => ((wx + 0.975) / 1.95) * w;
  const iz = (wz: number) => ((wz + 0.66) / 1.32) * h;

  // Subtle dark PCB traces
  ctx.strokeStyle = '#1f232c';
  ctx.lineWidth = 3;
  for (let z = -0.45; z <= 0.45; z += 0.15) {
    ctx.beginPath();
    ctx.moveTo(ix(-0.75), iz(z));
    ctx.lineTo(ix(0.42), iz(z));
    ctx.stroke();
  }

  // 4 silver/tin M3 corner mounting pads baked cleanly
  const corners: [number, number][] = [
    [-0.84, -0.53],
    [0.84, -0.53],
    [-0.84, 0.53],
    [0.84, 0.53],
  ];
  for (const [cx, cz] of corners) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(ix(cx), iz(cz), 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crisp white silkscreen legends
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "PWR" near USB-C top-left
  ctx.font = 'bold 15px monospace';
  ctx.fillText('PWR', ix(-0.85), iz(-0.27));

  // "BOOT" and "RESET" along top-left buttons
  ctx.font = 'bold 14px monospace';
  ctx.fillText('BOOT', ix(-0.68), iz(-0.36));
  ctx.fillText('RESET', ix(-0.5), iz(-0.36));

  // "CRCibernética" along bottom-left-center
  ctx.font = 'italic bold 26px sans-serif';
  ctx.fillText('CRCibernética', ix(-0.36), iz(0.56));

  // "Vin" & "- +" near green terminal block
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Vin', ix(-0.89), iz(0.45));
  ctx.font = 'bold 18px monospace';
  ctx.fillText('-', ix(-0.79), iz(0.16));
  ctx.fillText('+', ix(-0.67), iz(0.54));

  // "MOTOR 2" and "Qwiic" labels along bottom edge
  ctx.font = 'bold 13px monospace';
  ctx.fillText('MOTOR 2', ix(-0.04), iz(0.42));
  ctx.fillText('Qwiic', ix(0.22), iz(0.4));

  // "IO02" beside NeoPixel LED + tiny bulb circle
  ctx.font = 'bold 14px monospace';
  ctx.fillText('IO02', ix(0.18), iz(0.14));
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ix(0.05), iz(0.12), 9, 0, Math.PI * 2);
  ctx.stroke();

  // GPIO labels next to upper & lower header banks
  ctx.font = '12px monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('GND +3.3v IO27 IO33 IO32', ix(0.42), iz(-0.36));
  ctx.fillText('GND +3.3v SCL  SDA IO05', ix(0.42), iz(0.35));

  // Right-edge PCB trace meander antenna pattern on module area
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const ax0 = ix(0.79);
  const az0 = iz(-0.18);
  ctx.moveTo(ax0, az0);
  for (let step = 0; step < 5; step++) {
    const yy = az0 + step * 28;
    ctx.lineTo(ax0 + 36, yy);
    ctx.lineTo(ax0 + 36, yy + 14);
    ctx.lineTo(ax0, yy + 14);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createBrushedMetalRoughnessTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    const shade = 110 + Math.floor(Math.sin(y * 0.7) * 24);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, 256, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function Board3DSceneView({
  latestPacket,
  matrixPixels,
  thresholds,
}: Board3DSceneViewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [dockOpen, setDockOpen] = useState(true);
  const [exploded, setExploded] = useState(0);
  const [syncImu, setSyncImu] = useState(true);
  const [activePreset, setActivePreset] = useState<CameraPreset>('iso');

  const packetRef = useRef(latestPacket);
  const matrixRef = useRef(matrixPixels);
  const thresholdsRef = useRef(thresholds);
  const explodedTargetRef = useRef(exploded);
  const syncImuRef = useRef(syncImu);
  const cameraTransitionRef = useRef<CameraPreset | null>(null);

  packetRef.current = latestPacket;
  matrixRef.current = matrixPixels;
  thresholdsRef.current = thresholds;
  explodedTargetRef.current = exploded;
  syncImuRef.current = syncImu;

  const triggerPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    cameraTransitionRef.current = preset;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color('#0b1220');
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0x0b1220, 0.055);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 40);
    camera.position.set(...CAMERA_PRESETS.iso.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.9);
    keyLight.position.set(4.0, 6.5, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.72);
    rimLight.position.set(-4, 2.5, -4);
    scene.add(rimLight);

    // Lower workbench stage (FrontSide only so underside QR view is unobstructed)
    const groundGeo = new THREE.CircleGeometry(14, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.06,
      side: THREE.FrontSide,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.25;
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(12, 24, 0x1e293b, 0x162032);
    gridHelper.position.y = -0.24;
    scene.add(gridHelper);

    const shadowDiscGeo = new THREE.CircleGeometry(2.35, 32);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const contactShadow = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -0.22;
    scene.add(contactShadow);

    // Root hardware rig (IdeaSense Explorer hero left/center + connected IdeaBoard ESP32 right)
    const rigGroup = new THREE.Group();
    rigGroup.position.set(0, 0.35, 0);
    scene.add(rigGroup);

    const explorerGroup = new THREE.Group();
    explorerGroup.position.set(-0.62, 0, 0);
    rigGroup.add(explorerGroup);

    const brushedTex = createBrushedMetalRoughnessTexture();
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.24,
      metalness: 0.92,
      roughnessMap: brushedTex,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.9,
    });
    const whiteNylonMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.42,
      metalness: 0.04,
    });

    // 1. Matte-black IdeaSense Explorer PCB body with 4 corner ears + M3 holes
    const explorerShape = createIdeaSenseSilhouetteShape(true);
    const pcbGeo = new THREE.ExtrudeGeometry(explorerShape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    pcbGeo.rotateX(Math.PI / 2);

    const pcbBodyMat = new THREE.MeshStandardMaterial({
      color: 0x14161b,
      roughness: 0.62,
      metalness: 0.08,
    });
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbBodyMat);
    pcbMesh.castShadow = !isSoftwareGl;
    pcbMesh.receiveShadow = !isSoftwareGl;
    explorerGroup.add(pcbMesh);

    // Front & Back crisp silkscreen overlays shaped to silhouette (polygonOffset avoids z-fighting)
    const decalShape = createIdeaSenseSilhouetteShape(true);
    const decalGeo = new THREE.ShapeGeometry(decalShape, 16);
    // Normalize UVs cleanly across [-1.38, 1.38] -> [0, 1]
    const posAttr = decalGeo.attributes.position;
    const uvArray = new Float32Array(posAttr.count * 2);
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      uvArray[i * 2] = (px + 1.38) / 2.76;
      uvArray[i * 2 + 1] = (py + 1.38) / 2.76;
    }
    decalGeo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));

    const frontTex = createIdeaSenseFrontTexture();
    frontTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      roughness: 0.58,
      metalness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const frontDecal = new THREE.Mesh(decalGeo, frontMat);
    frontDecal.rotation.x = -Math.PI / 2;
    frontDecal.position.y = 0.013;
    explorerGroup.add(frontDecal);

    const backTex = createIdeaSenseBackTexture();
    backTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const backDecalGeo = decalGeo.clone();
    const backMat = new THREE.MeshStandardMaterial({
      map: backTex,
      roughness: 0.6,
      metalness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const backDecal = new THREE.Mesh(backDecalGeo, backMat);
    backDecal.rotation.x = Math.PI / 2;
    backDecal.position.y = -0.078;
    explorerGroup.add(backDecal);

    // 4 plated metallic inner M3 barrel sleeves (no coplanar overlap)
    const barrelGeo = new THREE.CylinderGeometry(0.086, 0.086, 0.088, 24, 1, true);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.25,
      metalness: 0.88,
      side: THREE.DoubleSide,
    });
    const earPositions: [number, number][] = [
      [-1.16, -1.16],
      [1.16, -1.16],
      [-1.16, 1.16],
      [1.16, 1.16],
    ];
    for (const [ex, ez] of earPositions) {
      const sleeve = new THREE.Mesh(barrelGeo, barrelMat);
      sleeve.position.set(ex, -0.032, ez);
      explorerGroup.add(sleeve);
    }

    // Explodable SMD Component Layers on IdeaSense Explorer
    const smdTopLayer = new THREE.Group();
    explorerGroup.add(smdTopLayer);

    // 2. Dual White 4-Pin Qwiic / STEMMA QT Connectors (left & right edges)
    function buildQwiicPort(x: number, z: number, facingLeft: boolean) {
      const qGroup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.34), whiteNylonMat);
      body.castShadow = !isSoftwareGl;
      const cavity = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.07, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 }),
      );
      cavity.position.set(facingLeft ? -0.09 : 0.09, 0.005, 0);
      qGroup.add(body, cavity);
      qGroup.position.set(x, 0.072, z);
      return qGroup;
    }
    smdTopLayer.add(buildQwiicPort(-0.92, -0.5, true));
    smdTopLayer.add(buildQwiicPort(0.92, -0.5, false));

    // 3. Large Wide HT16K33 SOIC-28 Driver IC (center between Qwiic ports)
    const driverGroup = new THREE.Group();
    const htBodyMat = new THREE.MeshStandardMaterial({
      color: 0x11141c,
      roughness: 0.45,
      metalness: 0.12,
    });
    const htBody = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.09, 0.42), htBodyMat);
    htBody.castShadow = !isSoftwareGl;
    driverGroup.add(htBody);
    // 28 silver gull-wing IC pins via InstancedMesh
    const icPinGeo = new THREE.BoxGeometry(0.032, 0.03, 0.08);
    const icPins = new THREE.InstancedMesh(icPinGeo, metalMat, 28);
    const icDummy = new THREE.Object3D();
    for (let i = 0; i < 14; i++) {
      const px = -0.45 + i * 0.069;
      icDummy.position.set(px, -0.025, -0.23);
      icDummy.updateMatrix();
      icPins.setMatrixAt(i, icDummy.matrix);
      icDummy.position.set(px, -0.025, 0.23);
      icDummy.updateMatrix();
      icPins.setMatrixAt(i + 14, icDummy.matrix);
    }
    icPins.computeBoundingSphere();
    driverGroup.add(icPins);
    driverGroup.position.set(0, 0.058, -0.48);
    smdTopLayer.add(driverGroup);

    // 4. Top Sensor Row: LTR-303 ("L"), LSM6DS ("Y/X/Z"), SHT30 ("T/H")
    const opticalMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      roughness: 0.14,
      metalness: 0.08,
      clearcoat: 1.0,
    });
    const opticalGroup = new THREE.Group();
    const ltrBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.04, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }),
    );
    const ltrWindow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.11), opticalMat);
    ltrWindow.position.y = 0.028;
    opticalGroup.add(ltrBase, ltrWindow);
    opticalGroup.position.set(-0.62, 0.034, -0.98);
    smdTopLayer.add(opticalGroup);

    const imuMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x059669,
      emissiveIntensity: 0.12,
      roughness: 0.38,
      metalness: 0.25,
    });
    const imuChip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.16), imuMat);
    imuChip.position.set(-0.18, 0.036, -1.1);
    smdTopLayer.add(imuChip);

    const thermalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x000000,
      roughness: 0.68,
      metalness: 0.05,
    });
    const thermalGroup = new THREE.Group();
    const shtSub = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.03, 0.17),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 }),
    );
    const shtCap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.13), thermalMat);
    shtCap.position.y = 0.025;
    thermalGroup.add(shtSub, shtCap);
    thermalGroup.position.set(0.35, 0.03, -0.98);
    smdTopLayer.add(thermalGroup);

    // 5. Left-margin SMD passive resistors/capacitors (matching IdeaSense.png)
    const passiveBodyGeo = new THREE.BoxGeometry(0.08, 0.028, 0.042);
    const passiveMat = new THREE.MeshStandardMaterial({ color: 0xb48a5a, roughness: 0.45 });
    const passives = new THREE.InstancedMesh(passiveBodyGeo, passiveMat, 8);
    const pDummy = new THREE.Object3D();
    for (let i = 0; i < 6; i++) {
      pDummy.position.set(-0.88 + (i % 2) * 0.1, 0.026, -0.05 + Math.floor(i / 2) * 0.18);
      pDummy.updateMatrix();
      passives.setMatrixAt(i, pDummy.matrix);
    }
    // 2 tiny passives beside LTR-303
    pDummy.position.set(-0.48, 0.026, -0.96);
    pDummy.updateMatrix();
    passives.setMatrixAt(6, pDummy.matrix);
    pDummy.position.set(-0.48, 0.026, -1.04);
    pDummy.updateMatrix();
    passives.setMatrixAt(7, pDummy.matrix);
    passives.computeBoundingSphere();
    smdTopLayer.add(passives);

    // 6. 5x5 SMD LED Matrix (25 crisp white SMD packages with glowing diodes directly on PCB)
    const ledFrameGeo = new THREE.BoxGeometry(0.13, 0.028, 0.095);
    const ledFrames = new THREE.InstancedMesh(ledFrameGeo, whiteNylonMat, 25);
    const ledFrameDummy = new THREE.Object3D();
    const ledMeshes: THREE.Mesh[] = [];
    const ledLensGeo = new THREE.BoxGeometry(0.085, 0.022, 0.068);
    let idx = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const lx = -0.38 + col * 0.19;
        const lz = 0.0 + row * 0.19;
        ledFrameDummy.position.set(lx, 0.026, lz);
        ledFrameDummy.updateMatrix();
        ledFrames.setMatrixAt(idx++, ledFrameDummy.matrix);

        const mat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          emissive: 0x000000,
          emissiveIntensity: 0,
          roughness: 0.18,
          metalness: 0.05,
        });
        const led = new THREE.Mesh(ledLensGeo, mat);
        led.position.set(lx, 0.042, lz);
        smdTopLayer.add(led);
        ledMeshes.push(led);
      }
    }
    ledFrames.computeBoundingSphere();
    smdTopLayer.add(ledFrames);

    // 7. Three Tactile Pushbuttons A, B, C along bottom edge
    const btnGroup = new THREE.Group();
    const btnSwitchBaseGeo = new THREE.BoxGeometry(0.24, 0.05, 0.22);
    const btnCapGeo = new THREE.CylinderGeometry(0.062, 0.068, 0.05, 20);
    const btnCapMats = [
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.15 }),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.15 }),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.15 }),
    ];
    const btnCaps: THREE.Mesh[] = [];
    const btnXs = [-0.42, 0.0, 0.42];
    btnXs.forEach((bx, bi) => {
      const wrap = new THREE.Group();
      const housing = new THREE.Mesh(btnSwitchBaseGeo, metalMat);
      housing.castShadow = !isSoftwareGl;
      const cap = new THREE.Mesh(btnCapGeo, btnCapMats[bi]);
      cap.position.y = 0.042;
      wrap.add(housing, cap);
      wrap.position.set(bx, 0.036, 1.07);
      btnGroup.add(wrap);
      btnCaps.push(cap);
    });
    explorerGroup.add(btnGroup);

    // 8. Companion IdeaBoard (CRCibernética ESP32) matching image_3ca53cac.png
    const ideaBoardGroup = new THREE.Group();
    ideaBoardGroup.position.set(2.02, -0.02, 0.04);
    rigGroup.add(ideaBoardGroup);

    const ibShape = new THREE.Shape();
    const ibw = 1.95;
    const ibd = 1.32;
    const ibr = 0.11;
    ibShape.moveTo(-ibw / 2 + ibr, -ibd / 2);
    ibShape.lineTo(ibw / 2 - ibr, -ibd / 2);
    ibShape.quadraticCurveTo(ibw / 2, -ibd / 2, ibw / 2, -ibd / 2 + ibr);
    ibShape.lineTo(ibw / 2, ibd / 2 - ibr);
    ibShape.quadraticCurveTo(ibw / 2, ibd / 2, ibw / 2 - ibr, ibd / 2);
    ibShape.lineTo(-ibw / 2 + ibr, ibd / 2);
    ibShape.quadraticCurveTo(-ibw / 2, ibd / 2, -ibw / 2, ibd / 2 - ibr);
    ibShape.lineTo(-ibw / 2, -ibd / 2 + ibr);
    ibShape.quadraticCurveTo(-ibw / 2, -ibd / 2, -ibw / 2 + ibr, -ibd / 2);

    const ibCornerHoles: [number, number][] = [
      [-0.84, -0.53],
      [0.84, -0.53],
      [-0.84, 0.53],
      [0.84, 0.53],
    ];
    for (const [hx, hz] of ibCornerHoles) {
      const hPath = new THREE.Path();
      hPath.absarc(hx, hz, 0.064, 0, Math.PI * 2, true);
      ibShape.holes.push(hPath);
    }

    const ibGeo = new THREE.ExtrudeGeometry(ibShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    });
    ibGeo.rotateX(Math.PI / 2);
    const ibTex = createIdeaBoardTexture();
    ibTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const ibMesh = new THREE.Mesh(
      ibGeo,
      new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.62, metalness: 0.08 }),
    );
    ibMesh.castShadow = !isSoftwareGl;
    ideaBoardGroup.add(ibMesh);

    const ibDecalGeo = new THREE.ShapeGeometry(ibShape, 12);
    const ibPosAttr = ibDecalGeo.attributes.position;
    const ibUvs = new Float32Array(ibPosAttr.count * 2);
    for (let i = 0; i < ibPosAttr.count; i++) {
      ibUvs[i * 2] = (ibPosAttr.getX(i) + ibw / 2) / ibw;
      ibUvs[i * 2 + 1] = (ibPosAttr.getY(i) + ibd / 2) / ibd;
    }
    ibDecalGeo.setAttribute('uv', new THREE.BufferAttribute(ibUvs, 2));
    const ibDecal = new THREE.Mesh(
      ibDecalGeo,
      new THREE.MeshStandardMaterial({
        map: ibTex,
        roughness: 0.58,
        metalness: 0.08,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    ibDecal.rotation.x = -Math.PI / 2;
    ibDecal.position.y = 0.012;
    ideaBoardGroup.add(ibDecal);

    // Silver M3 corner barrel sleeves on IdeaBoard
    const ibSleeveGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.082, 20, 1, true);
    const silverSleeveMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.24,
      metalness: 0.88,
      side: THREE.DoubleSide,
    });
    for (const [hx, hz] of ibCornerHoles) {
      const sleeve = new THREE.Mesh(ibSleeveGeo, silverSleeveMat);
      sleeve.position.set(hx, -0.028, hz);
      ideaBoardGroup.add(sleeve);
    }

    // USB-C Metallic Port (left center edge)
    const ibUsb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.11, 0.28), metalMat);
    ibUsb.position.set(-0.91, 0.065, 0.02);
    ibUsb.castShadow = !isSoftwareGl;
    ideaBoardGroup.add(ibUsb);

    // Iconic Bright-Green 2-Pin Vin Screw Terminal Block (lower-left)
    const vinGroup = new THREE.Group();
    const vinMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.45,
      metalness: 0.05,
    });
    const vinBlock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.34), vinMat);
    vinBlock.castShadow = !isSoftwareGl;
    vinGroup.add(vinBlock);
    const screwGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.03, 16);
    const cavityGeo = new THREE.BoxGeometry(0.06, 0.08, 0.09);
    const darkCavityMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85 });
    [-0.08, 0.08].forEach((sz) => {
      const screw = new THREE.Mesh(screwGeo, metalMat);
      screw.position.set(0, 0.105, sz);
      const hole = new THREE.Mesh(cavityGeo, darkCavityMat);
      hole.position.set(-0.1, -0.02, sz);
      vinGroup.add(screw, hole);
    });
    vinGroup.position.set(-0.76, 0.11, 0.34);
    ideaBoardGroup.add(vinGroup);

    // BOOT & RESET SMD Tactile Buttons (upper-left edge)
    [-0.68, -0.5].forEach((bx) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.1), metalMat);
      sw.position.set(bx, 0.03, -0.49);
      const plunger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12),
        darkCavityMat,
      );
      plunger.position.set(bx, 0.055, -0.49);
      ideaBoardGroup.add(sw, plunger);
    });

    // CH340 USB-UART IC, Voltage Regulator & Motor Driver ICs + central jumper
    const icBodyMat = new THREE.MeshStandardMaterial({ color: 0x11141c, roughness: 0.48, metalness: 0.12 });
    const ch340 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.042, 0.14), icBodyMat);
    ch340.position.set(-0.46, 0.032, 0.0);
    const xtal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.12), metalMat);
    xtal.position.set(-0.56, 0.028, -0.2);
    const reg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.15), icBodyMat);
    reg.position.set(-0.34, 0.032, 0.32);
    const drv1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.038, 0.12), icBodyMat);
    drv1.position.set(-0.12, 0.032, -0.24);
    const drv2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.038, 0.12), icBodyMat);
    drv2.position.set(0.02, 0.032, 0.22);
    const centerJumper = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.11, 0.11),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 }),
    );
    centerJumper.position.set(-0.08, 0.068, -0.02);
    ideaBoardGroup.add(ch340, xtal, reg, drv1, drv2, centerJumper);

    // MOTOR 1 (top-left) & MOTOR 2 (bottom-center) 2-pin male headers
    const headerShroudMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    [
      [-0.32, -0.54],
      [-0.04, 0.54],
    ].forEach(([mx, mz]) => {
      const mBase = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.06), headerShroudMat);
      mBase.position.set(mx, 0.034, mz);
      ideaBoardGroup.add(mBase);
      [-0.025, 0.025].forEach((dx) => {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.16, 8), metalMat);
        pin.position.set(mx + dx, 0.09, mz);
        ideaBoardGroup.add(pin);
      });
    });

    // Black 4-Pin Qwiic Connector (bottom-right edge facing +Z)
    const ibBlackQwiicGroup = new THREE.Group();
    const ibQwiicBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.1, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.52, metalness: 0.06 }),
    );
    ibQwiicBody.castShadow = !isSoftwareGl;
    const ibQwiicCavity = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.06, 0.05), darkCavityMat);
    ibQwiicCavity.position.set(0, 0, 0.075);
    ibBlackQwiicGroup.add(ibQwiicBody, ibQwiicCavity);
    ibBlackQwiicGroup.position.set(0.22, 0.062, 0.55);
    ideaBoardGroup.add(ibBlackQwiicGroup);

    // Addressable White-Framed RGB NeoPixel (ib.pixel, IO02) in center-right
    const ibRgbFrame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.036, 0.15), whiteNylonMat);
    ibRgbFrame.position.set(0.18, 0.03, -0.04);
    const ibRgbMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.9,
      roughness: 0.18,
    });
    const ibRgbLed = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.03, 18), ibRgbMat);
    ibRgbLed.position.set(0.18, 0.042, -0.04);
    ideaBoardGroup.add(ibRgbFrame, ibRgbLed);

    // Dual-Row 2x8 Black-Shrouded Tall Silver GPIO Pin Banks (top & bottom on right half)
    const topShroud = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.075, 0.14), headerShroudMat);
    topShroud.position.set(0.42, 0.05, -0.5);
    const botShroud = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.075, 0.14), headerShroudMat);
    botShroud.position.set(0.42, 0.05, 0.48);
    ideaBoardGroup.add(topShroud, botShroud);

    const ibPinGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8);
    const ibPins = new THREE.InstancedMesh(ibPinGeo, metalMat, 32);
    const ibDummy = new THREE.Object3D();
    let ibPinIdx = 0;
    for (let col = 0; col < 8; col++) {
      const px = 0.18 + col * 0.068;
      for (let row = 0; row < 2; row++) {
        ibDummy.position.set(px, 0.125, -0.535 + row * 0.068);
        ibDummy.updateMatrix();
        ibPins.setMatrixAt(ibPinIdx++, ibDummy.matrix);
        ibDummy.position.set(px, 0.125, 0.445 + row * 0.068);
        ibDummy.updateMatrix();
        ibPins.setMatrixAt(ibPinIdx++, ibDummy.matrix);
      }
    }
    ibPins.computeBoundingSphere();
    ideaBoardGroup.add(ibPins);

    // ESP32-WROOM-32E Module (black PCB extending to right edge + brushed metallic RF can)
    const espBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.032, 0.56),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72 }),
    );
    espBase.position.set(0.63, 0.028, -0.01);
    const espCan = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.48), metalMat);
    espCan.position.set(0.52, 0.072, -0.01);
    espCan.castShadow = !isSoftwareGl;
    ideaBoardGroup.add(espBase, espCan);

    // 4-wire Qwiic cable (black, red, yellow, white) connecting IdeaSense Explorer right white Qwiic to IdeaBoard black Qwiic
    const cableGroup = new THREE.Group();
    const wireColors = [0x111827, 0xef4444, 0xfacc15, 0xf8fafc];
    wireColors.forEach((colHex, wi) => {
      const zOff = (wi - 1.5) * 0.028;
      const xOff = (wi - 1.5) * 0.028;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.38, 0.072, -0.5 + zOff),
        new THREE.Vector3(0.86, 0.08, -0.22 + zOff * 1.2),
        new THREE.Vector3(1.12, 0.02, 0.78 + zOff * 0.8),
        new THREE.Vector3(1.92, 0.03, 0.84 + zOff * 0.7),
        new THREE.Vector3(2.24 + xOff, 0.045, 0.62),
      ]);
      const wireGeo = new THREE.TubeGeometry(curve, 32, 0.014, 8, false);
      const wireMat = new THREE.MeshStandardMaterial({ color: colHex, roughness: 0.48, metalness: 0.05 });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.castShadow = !isSoftwareGl;
      cableGroup.add(wire);
    });
    rigGroup.add(cableGroup);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.iso.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.6;
    controls.maxDistance = 8.5;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.addEventListener('start', () => {
      cameraTransitionRef.current = null;
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let lastClock = performance.now();
    let currentExploded = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastClock) / 1000);
      lastClock = now;

      const pkt = packetRef.current;
      const thr = thresholdsRef.current;
      const accelDelta = Math.abs(computeAccelMagnitude(pkt) - 1.0);
      const gyroMag = computeGyroMagnitude(pkt);
      const isTamper = accelDelta > thr.maxAccelDeltaG || gyroMag > thr.maxGyroDps;
      const isOptical = pkt.l > thr.maxLightCounts || pkt.l < thr.minLightCounts;
      const isThermal = pkt.t > thr.maxTempC;

      // Damped IMU tilt orientation applied to IdeaSense Explorer
      const targetPitch = syncImuRef.current ? THREE.MathUtils.clamp(pkt.ay * 0.42, -0.45, 0.45) : 0;
      const targetRoll = syncImuRef.current ? THREE.MathUtils.clamp(-pkt.ax * 0.42, -0.45, 0.45) : 0;
      const dampFactor = 1 - Math.exp(-8 * dt);
      rigGroup.rotation.x += (targetPitch - rigGroup.rotation.x) * dampFactor;
      rigGroup.rotation.z += (targetRoll - rigGroup.rotation.z) * dampFactor;

      // Damped exploded view separation
      currentExploded += (explodedTargetRef.current - currentExploded) * dampFactor;
      smdTopLayer.position.y = currentExploded * 0.48;
      btnGroup.position.y = currentExploded * 0.24;
      ideaBoardGroup.position.x = 2.02 + currentExploded * 0.45;
      cableGroup.position.y = currentExploded * 0.14;

      // Tactile button travel (A = ba, B & C = bb)
      btnCaps[0].position.y = pkt.ba === 1 ? 0.022 : 0.042;
      btnCapMats[0].color.setHex(pkt.ba === 1 ? 0x38bdf8 : 0x1e293b);
      btnCaps[1].position.y = pkt.bb === 1 ? 0.022 : 0.042;
      btnCapMats[1].color.setHex(pkt.bb === 1 ? 0x38bdf8 : 0x1e293b);
      btnCaps[2].position.y = pkt.bb === 1 ? 0.022 : 0.042;
      btnCapMats[2].color.setHex(pkt.bb === 1 ? 0x38bdf8 : 0x1e293b);

      // Update 25 3D SMD LEDs on IdeaSense Explorer matrix
      const ledColorHex = isTamper || isThermal ? 0xef4444 : 0x38bdf8;
      const pixels = matrixRef.current;
      for (let i = 0; i < 25; i++) {
        const mat = ledMeshes[i].material as THREE.MeshStandardMaterial;
        const on = pixels[i] === 1;
        mat.color.setHex(on ? ledColorHex : 0x334155);
        mat.emissive.setHex(on ? ledColorHex : 0x000000);
        mat.emissiveIntensity = on ? 1.15 : 0;
      }

      // Live sensor status highlights + IdeaBoard ib.pixel RGB LED
      opticalMat.emissive.setHex(isOptical ? 0xf59e0b : 0x0284c7);
      opticalMat.emissiveIntensity = isOptical ? 1.1 : Math.min(0.65, pkt.l / 900);
      thermalMat.emissive.setHex(isThermal ? 0xdc2626 : 0x000000);
      thermalMat.emissiveIntensity = isThermal ? 0.85 : 0;
      imuMat.emissive.setHex(isTamper ? 0xef4444 : 0x059669);
      imuMat.emissiveIntensity = isTamper ? 0.9 : 0.14;

      const rgbHex = isTamper || isThermal ? 0xef4444 : isOptical ? 0xf59e0b : 0x10b981;
      ibRgbMat.color.setHex(rgbHex);
      ibRgbMat.emissive.setHex(rgbHex);

      // Damped camera preset transitions
      const presetKey = cameraTransitionRef.current;
      if (presetKey) {
        const p = CAMERA_PRESETS[presetKey];
        _targetCamPos.set(...p.pos);
        _targetLookAt.set(...p.target);
        const camAlpha = 1 - Math.exp(-6 * dt);
        camera.position.lerp(_targetCamPos, camAlpha);
        controls.target.lerp(_targetLookAt, camAlpha);
        if (camera.position.distanceTo(_targetCamPos) < 0.03) {
          cameraTransitionRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      frontTex.dispose();
      backTex.dispose();
      ibTex.dispose();
      brushedTex.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
          else m.material?.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative h-[620px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-800">
      <div
        ref={mountRef}
        data-testid="board-3d-canvas-container"
        className="h-full w-full"
      />

      {/* Minimal Top-Left Spec Bar (solid/rgba surface, no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200">
        <div className="font-display font-semibold text-white">
          Gemelo Digital 3D · IdeaSense Explorer + IdeaBoard
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
          Ax {latestPacket.ax.toFixed(2)}g · Ay {latestPacket.ay.toFixed(2)}g · Luz {latestPacket.l} · Temp {latestPacket.t.toFixed(1)}°C
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (no backdrop-filter) */}
      <div className="absolute bottom-4 left-1/2 z-10 flex w-[min(820px,95%)] -translate-x-1/2 flex-col items-center">
        <button
          type="button"
          onClick={() => setDockOpen((o) => !o)}
          className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/95 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
        >
          {dockOpen ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              Ocultar controles
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              Mostrar controles
            </>
          )}
        </button>

        {dockOpen && (
          <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-xs text-slate-200">
            <div className="flex items-center gap-1.5" role="group" aria-label="Vistas de cámara 3D">
              {(
                [
                  { id: 'iso', label: 'Isométrica' },
                  { id: 'top', label: 'Superior' },
                  { id: 'sensors', label: 'Sensores' },
                  { id: 'back', label: 'Reverso QR' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => triggerPreset(p.id)}
                  className={`rounded-md px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                    activePreset === p.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 font-medium text-slate-300">
              <Layers className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>Vista explotada</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={exploded}
                onChange={(e) => setExploded(Number(e.target.value))}
                className="w-24 accent-blue-500"
              />
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-slate-300">
              <input
                type="checkbox"
                checked={syncImu}
                onChange={(e) => setSyncImu(e.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
              Inclinación IMU
            </label>

            <button
              type="button"
              onClick={() => {
                setExploded(0);
                triggerPreset('iso');
              }}
              aria-label="Restablecer vista 3D"
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-slate-300 hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reiniciar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
