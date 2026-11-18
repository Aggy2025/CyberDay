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

type CameraPreset = 'iso' | 'top' | 'sensors';

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  iso: { pos: [3.2, 2.7, 3.6], target: [0, 0.15, 0] },
  top: { pos: [0.01, 4.4, 0.35], target: [0, 0.15, 0] },
  sensors: { pos: [2.3, 1.45, 1.8], target: [0.55, 0.2, 0.05] },
};

// Pre-allocated math scratch objects outside render loop
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

function createPcbSurfaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(0, 0, 512, 512);

  // Copper trace lines
  ctx.strokeStyle = '#312e81';
  ctx.lineWidth = 3;
  for (let i = 32; i < 480; i += 28) {
    ctx.beginPath();
    ctx.moveTo(24, i);
    ctx.lineTo(180, i);
    ctx.lineTo(220, i + 12);
    ctx.lineTo(488, i + 12);
    ctx.stroke();
  }

  // Gold fiducial pads & header labels
  ctx.fillStyle = '#d4af37';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.arc(46 + i * 38, 476, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('IDEASENSE EXPLORER · CENFOTEC', 34, 46);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('I2C · LSM6DS · SHT30 · LTR-303 · ESP32', 34, 72);

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
    scene.fog = new THREE.FogExp2(0x0b1220, 0.065);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 40);
    camera.position.set(...CAMERA_PRESETS.iso.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm key directional light + cool HemisphereLight fill
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1e0, 1.85);
    keyLight.position.set(4.5, 6.5, 4.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-4, 2.5, -4);
    scene.add(rimLight);

    // Workbench Ground + Soft Contact Shadow Disc
    const groundGeo = new THREE.CircleGeometry(14, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.88,
      metalness: 0.08,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(12, 24, 0x1e293b, 0x162032);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const shadowDiscGeo = new THREE.CircleGeometry(2.2, 32);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    scene.add(contactShadow);

    // Composite 3-12+ part IdeaBoard + IdeaSense Explorer Group (bottom-center grounded)
    const boardGroup = new THREE.Group();
    boardGroup.position.set(0, 0.34, 0);
    scene.add(boardGroup);

    // 1. Primary silhouette: Beveled PCB Substrate (ExtrudeGeometry)
    const pcbShape = new THREE.Shape();
    const bw = 2.8;
    const bd = 1.85;
    const br = 0.14;
    pcbShape.moveTo(-bw / 2 + br, -bd / 2);
    pcbShape.lineTo(bw / 2 - br, -bd / 2);
    pcbShape.quadraticCurveTo(bw / 2, -bd / 2, bw / 2, -bd / 2 + br);
    pcbShape.lineTo(bw / 2, bd / 2 - br);
    pcbShape.quadraticCurveTo(bw / 2, bd / 2, bw / 2 - br, bd / 2);
    pcbShape.lineTo(-bw / 2 + br, bd / 2);
    pcbShape.quadraticCurveTo(-bw / 2, bd / 2, -bw / 2, bd / 2 - br);
    pcbShape.lineTo(-bw / 2, -bd / 2 + br);
    pcbShape.quadraticCurveTo(-bw / 2, -bd / 2, -bw / 2 + br, -bd / 2);

    const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    pcbGeo.rotateX(Math.PI / 2);

    const pcbTex = createPcbSurfaceTexture();
    pcbTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: pcbTex,
      roughness: 0.55,
      metalness: 0.12,
    });
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.castShadow = !isSoftwareGl;
    pcbMesh.receiveShadow = !isSoftwareGl;
    boardGroup.add(pcbMesh);

    // 2. USB-C Metallic Port (left edge)
    const brushedTex = createBrushedMetalRoughnessTexture();
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.24,
      metalness: 0.92,
      roughnessMap: brushedTex,
    });
    const usbGeo = new THREE.BoxGeometry(0.32, 0.12, 0.36);
    const usbMesh = new THREE.Mesh(usbGeo, metalMat);
    usbMesh.position.set(-1.32, 0.08, 0);
    usbMesh.castShadow = !isSoftwareGl;
    boardGroup.add(usbMesh);

    // 3. ESP32-WROOM Shield Can (upper left)
    const shieldGroup = new THREE.Group();
    const espBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.72,
      metalness: 0.1,
    });
    const espSubstrate = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.54), espBaseMat);
    const espCan = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.46), metalMat);
    espCan.position.set(0.05, 0.06, 0);
    espCan.castShadow = !isSoftwareGl;
    shieldGroup.add(espSubstrate, espCan);
    shieldGroup.position.set(-0.78, 0.06, -0.42);
    boardGroup.add(shieldGroup);

    // 4. Tactile Buttons A & B/C (lower left)
    const btnGroup = new THREE.Group();
    const btnBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.2 });
    const btnCapMatA = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.1 });
    const btnCapMatB = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.1 });

    const btnBaseA = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.24), btnBaseMat);
    const btnCapA = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.06, 20), btnCapMatA);
    btnCapA.position.y = 0.05;
    const btnWrapA = new THREE.Group();
    btnWrapA.add(btnBaseA, btnCapA);
    btnWrapA.position.set(-0.84, 0.06, 0.22);

    const btnBaseB = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.24), btnBaseMat);
    const btnCapB = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.06, 20), btnCapMatB);
    btnCapB.position.y = 0.05;
    const btnWrapB = new THREE.Group();
    btnWrapB.add(btnBaseB, btnCapB);
    btnWrapB.position.set(-0.84, 0.06, 0.56);

    btnGroup.add(btnWrapA, btnWrapB);
    boardGroup.add(btnGroup);

    // 5. Explodable Upper Sensor Shield Layer (5x5 LED Matrix + LTR-303 + SHT30 + LSM6DS)
    const sensorLayerGroup = new THREE.Group();
    boardGroup.add(sensorLayerGroup);

    const matrixHousing = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 0.06, 1.06),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5, metalness: 0.25 }),
    );
    matrixHousing.position.set(0.05, 0.06, 0.02);
    matrixHousing.castShadow = !isSoftwareGl;
    sensorLayerGroup.add(matrixHousing);

    // 25 NeoPixel LED domes
    const ledMeshes: THREE.Mesh[] = [];
    const ledGeo = new THREE.BoxGeometry(0.14, 0.05, 0.14);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          emissive: 0x000000,
          emissiveIntensity: 0,
          roughness: 0.22,
          metalness: 0.05,
        });
        const led = new THREE.Mesh(ledGeo, mat);
        led.position.set(0.05 + (col - 2) * 0.19, 0.1, 0.02 + (row - 2) * 0.19);
        sensorLayerGroup.add(led);
        ledMeshes.push(led);
      }
    }

    // 6. Right-side Sensor Cluster: LTR-303 Optical Dome, SHT30 Temp Housing, LSM6DS IMU IC
    const opticalMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
    });
    const opticalSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 24), opticalMat);
    opticalSensor.position.set(0.98, 0.08, -0.45);
    sensorLayerGroup.add(opticalSensor);

    const thermalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x000000,
      roughness: 0.45,
      metalness: 0.35,
    });
    const thermalSensor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.26), thermalMat);
    thermalSensor.position.set(0.98, 0.07, 0.02);
    sensorLayerGroup.add(thermalSensor);

    const imuMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.4,
    });
    const imuSensor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.26), imuMat);
    imuSensor.position.set(0.98, 0.07, 0.48);
    sensorLayerGroup.add(imuSensor);

    // Gold GPIO Header Pins (20 repeated pins -> InstancedMesh)
    const pinGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.92, roughness: 0.18 });
    const pinInstanced = new THREE.InstancedMesh(pinGeo, pinMat, 24);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 12; i++) {
      dummy.position.set(-1.05 + i * 0.19, 0.06, -0.82);
      dummy.updateMatrix();
      pinInstanced.setMatrixAt(i, dummy.matrix);
      dummy.position.set(-1.05 + i * 0.19, 0.06, 0.82);
      dummy.updateMatrix();
      pinInstanced.setMatrixAt(i + 12, dummy.matrix);
    }
    pinInstanced.computeBoundingSphere();
    boardGroup.add(pinInstanced);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.iso.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.8;
    controls.maxDistance = 8.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
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

      // Damped IMU tilt orientation
      const targetPitch = syncImuRef.current ? THREE.MathUtils.clamp(pkt.ay * 0.45, -0.5, 0.5) : 0;
      const targetRoll = syncImuRef.current ? THREE.MathUtils.clamp(-pkt.ax * 0.45, -0.5, 0.5) : 0;
      const dampFactor = 1 - Math.exp(-8 * dt);
      boardGroup.rotation.x += (targetPitch - boardGroup.rotation.x) * dampFactor;
      boardGroup.rotation.z += (targetRoll - boardGroup.rotation.z) * dampFactor;

      // Damped exploded view separation
      currentExploded += (explodedTargetRef.current - currentExploded) * dampFactor;
      sensorLayerGroup.position.y = currentExploded * 0.45;
      shieldGroup.position.y = 0.06 + currentExploded * 0.25;
      btnGroup.position.y = currentExploded * 0.15;

      // Physical button travel
      btnCapA.position.y = pkt.ba === 1 ? 0.025 : 0.05;
      btnCapMatA.color.setHex(pkt.ba === 1 ? 0x3b82f6 : 0xe2e8f0);
      btnCapB.position.y = pkt.bb === 1 ? 0.025 : 0.05;
      btnCapMatB.color.setHex(pkt.bb === 1 ? 0x3b82f6 : 0xe2e8f0);

      // Update 25 3D NeoPixel LEDs
      const ledColorHex = isTamper || isThermal ? 0xef4444 : 0x38bdf8;
      const pixels = matrixRef.current;
      for (let i = 0; i < 25; i++) {
        const mat = ledMeshes[i].material as THREE.MeshStandardMaterial;
        const on = pixels[i] === 1;
        mat.color.setHex(on ? ledColorHex : 0x1e293b);
        mat.emissive.setHex(on ? ledColorHex : 0x000000);
        mat.emissiveIntensity = on ? 0.9 : 0;
      }

      // Sensor highlight feedback
      opticalMat.emissive.setHex(isOptical ? 0xf59e0b : 0x0284c7);
      opticalMat.emissiveIntensity = isOptical ? 1.0 : Math.min(0.6, pkt.l / 1000);
      thermalMat.emissive.setHex(isThermal ? 0xdc2626 : 0x000000);
      thermalMat.emissiveIntensity = isThermal ? 0.8 : 0;
      imuMat.color.setHex(isTamper ? 0xef4444 : 0x10b981);
      imuMat.emissive.setHex(isTamper ? 0xdc2626 : 0x059669);

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
      pcbTex.dispose();
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
          Gemelo Digital 3D · IdeaBoard ESP32
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
          Ax {latestPacket.ax.toFixed(2)}g · Ay {latestPacket.ay.toFixed(2)}g · Luz {latestPacket.l} · Temp {latestPacket.t.toFixed(1)}°C
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (no backdrop-filter) */}
      <div className="absolute bottom-4 left-1/2 z-10 flex w-[min(780px,94%)] -translate-x-1/2 flex-col items-center">
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
          <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-xs text-slate-200">
            <div className="flex items-center gap-1.5" role="group" aria-label="Vistas de cámara 3D">
              {(
                [
                  { id: 'iso', label: 'Isométrica' },
                  { id: 'top', label: 'Superior' },
                  { id: 'sensors', label: 'Sensores' },
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

            <label className="flex items-center gap-2.5 font-medium text-slate-300">
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
              Inclinación IMU en vivo
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
