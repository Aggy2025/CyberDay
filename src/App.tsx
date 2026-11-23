import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AiLabView } from './components/AiLabView';
import { AuditCopilotView } from './components/AuditCopilotView';
import { Board3DSceneView } from './components/Board3DSceneView';
import { CyberGamesHubView } from './components/CyberGamesHubView';
import { DataTransparencyBanner } from './components/DataTransparencyBanner';
import { FirmwareGuideView } from './components/FirmwareGuideView';
import { GeminiChatView } from './components/GeminiChatView';
import { SensorsGuideView } from './components/SensorsGuideView';
import { SidebarNav } from './components/SidebarNav';
import { SocMonitorView } from './components/SocMonitorView';
import { TopHeader } from './components/TopHeader';
import { IdeaSenseBleClient } from './lib/bleService';
import {
  classifyTelemetryWindow,
  computeThreatTrendPoint,
  createBaselineCyberDataset,
  DEFAULT_THRESHOLDS,
  evaluateSecurityAlerts,
  generateSimulatedTelemetry,
  resolveDataOrigin,
} from './lib/cyberEngine';
import { CYBER_MATRIX_PRESETS } from './lib/firmwareTemplate';
import type {
  ActiveTab,
  ConnectionMode,
  CyberScenario,
  KnnSample,
  SecurityAlert,
  SecurityThresholds,
  TelemetryPacket,
  ThreatTrendPoint,
} from './lib/types';

const STORAGE_DATASET_KEY = 'ideasense_cyber_knn_dataset_v1';
const STORAGE_THRESHOLDS_KEY = 'ideasense_cyber_thresholds_v1';

const INITIAL_PACKET: TelemetryPacket = {
  t: 25.4,
  h: 54.0,
  l: 290,
  ax: 0.0,
  ay: 0.0,
  az: 1.0,
  gx: 0.0,
  gy: 0.0,
  gz: 0.0,
  ba: 0,
  bb: 0,
  sim: 0,
  ts: Date.now(),
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('soc');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('demo');
  const [deviceName, setDeviceName] = useState('IdeaBoard BLE');
  const [bleError, setBleError] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<CyberScenario>('normal');

  const [latestPacket, setLatestPacket] = useState<TelemetryPacket>(INITIAL_PACKET);
  const [history, setHistory] = useState<TelemetryPacket[]>([]);
  const [threatHistory, setThreatHistory] = useState<ThreatTrendPoint[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [matrixPixels, setMatrixPixels] = useState<number[]>(
    CYBER_MATRIX_PRESETS[0].pixels,
  );

  const [thresholds, setThresholds] = useState<SecurityThresholds>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_THRESHOLDS_KEY);
      return saved ? { ...DEFAULT_THRESHOLDS, ...JSON.parse(saved) } : DEFAULT_THRESHOLDS;
    } catch {
      return DEFAULT_THRESHOLDS;
    }
  });

  const [dataset, setDataset] = useState<KnnSample[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DATASET_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as KnnSample[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to baseline
    }
    return createBaselineCyberDataset();
  });

  const [kNeighbors, setKNeighbors] = useState(3);

  const bleClientRef = useRef<IdeaSenseBleClient | null>(null);
  if (!bleClientRef.current) {
    bleClientRef.current = new IdeaSenseBleClient();
  }

  const tickRef = useRef(0);
  const lastAlertTsByCatRef = useRef<Record<string, number>>({});
  const lastTrendTsRef = useRef(0);
  const lastPredictedClassRef = useRef<string | null>(null);
  const buttonTransitionsRef = useRef<number[]>([]);
  const prevBtnStateRef = useRef<{ ba: number; bb: number }>({ ba: 0, bb: 0 });
  const thresholdsRef = useRef(thresholds);
  thresholdsRef.current = thresholds;

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  // Persist dataset and thresholds
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DATASET_KEY, JSON.stringify(dataset));
    } catch {
      // Ignore storage quota errors
    }
  }, [dataset]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_THRESHOLDS_KEY, JSON.stringify(thresholds));
    } catch {
      // Ignore storage quota errors
    }
  }, [thresholds]);

  const ingestPacket = useCallback((pkt: TelemetryPacket) => {
    const now = pkt.ts;

    // Track rising-edge button presses in last 3 seconds for brute-force detection
    if (
      (pkt.ba === 1 && prevBtnStateRef.current.ba === 0) ||
      (pkt.bb === 1 && prevBtnStateRef.current.bb === 0)
    ) {
      buttonTransitionsRef.current.push(now);
    }
    prevBtnStateRef.current = { ba: pkt.ba, bb: pkt.bb };
    buttonTransitionsRef.current = buttonTransitionsRef.current.filter((t) => now - t <= 3000);

    setLatestPacket(pkt);
    setHistory((prev) => {
      const next = [...prev, pkt];
      return next.length > 160 ? next.slice(next.length - 160) : next;
    });

    const triggered = evaluateSecurityAlerts(
      pkt,
      thresholdsRef.current,
      buttonTransitionsRef.current.length,
      now,
    );

    if (triggered.length > 0) {
      const fresh: SecurityAlert[] = [];
      for (const al of triggered) {
        const lastTs = lastAlertTsByCatRef.current[al.category] ?? 0;
        if (now - lastTs >= 2500) {
          lastAlertTsByCatRef.current[al.category] = now;
          fresh.push(al);
        }
      }
      if (fresh.length > 0) {
        setAlerts((prev) => [...fresh, ...prev].slice(0, 40));
      }
    }
  }, []);

  // 25 Hz Demo simulator loop
  useEffect(() => {
    if (connectionMode !== 'demo') return;
    const interval = window.setInterval(() => {
      tickRef.current += 1;
      const pkt = generateSimulatedTelemetry(activeScenario, tickRef.current, Date.now());
      ingestPacket(pkt);
    }, 40);
    return () => window.clearInterval(interval);
  }, [connectionMode, activeScenario, ingestPacket]);

  const handleConnectBle = async () => {
    setBleError(null);
    const client = bleClientRef.current!;
    try {
      const name = await client.connect({
        onPacket: (pkt) => ingestPacket(pkt),
        onDisconnect: () => {
          setConnectionMode('disconnected');
        },
        onError: (msg) => setBleError(msg),
      });
      setDeviceName(name);
      setConnectionMode('ble');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo establecer conexión BLE.';
      setBleError(msg);
    }
  };

  const handleDisconnectBle = () => {
    bleClientRef.current?.disconnect();
    setConnectionMode('disconnected');
  };

  const handleToggleDemo = () => {
    setBleError(null);
    if (connectionMode === 'demo') {
      setConnectionMode('disconnected');
    } else {
      setConnectionMode('demo');
    }
  };

  const syncMatrix = useCallback(
    (nextPixels: number[]) => {
      setMatrixPixels(nextPixels);
      if (connectionMode === 'ble') {
        bleClientRef.current?.sendMatrix(nextPixels).catch(() => {});
      }
    },
    [connectionMode],
  );

  const handleToggleMatrixPixel = (idx: number) => {
    const next = [...matrixPixels];
    next[idx] = next[idx] === 1 ? 0 : 1;
    syncMatrix(next);
  };

  const prediction = useMemo(() => {
    const win = history.slice(-30);
    return classifyTelemetryWindow(win, dataset, kNeighbors);
  }, [history, dataset, kNeighbors]);

  // Sample AI threat score once per second (or immediately when predicted class transitions)
  useEffect(() => {
    if (!prediction) return;
    const now = Date.now();
    const classChanged = lastPredictedClassRef.current !== prediction.predictedClass;
    if (!classChanged && now - lastTrendTsRef.current < 1000) return;

    lastTrendTsRef.current = now;
    lastPredictedClassRef.current = prediction.predictedClass;
    const pt = computeThreatTrendPoint(prediction, now);
    setThreatHistory((prev) => {
      const next = [...prev, pt];
      return next.length > 45 ? next.slice(next.length - 45) : next;
    });
  }, [prediction]);

  const dataOrigin = resolveDataOrigin(
    connectionMode,
    history.length > 0 ? latestPacket : null,
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SidebarNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertCount={alerts.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          activeTab={activeTab}
          connectionMode={connectionMode}
          deviceName={deviceName}
          isDark={isDark}
          onToggleTheme={() => setIsDark((d) => !d)}
          onConnectBle={handleConnectBle}
          onDisconnectBle={handleDisconnectBle}
          onToggleDemo={handleToggleDemo}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1380px] flex-1 space-y-6 p-4 sm:p-6">
          <DataTransparencyBanner
            connectionMode={connectionMode}
            dataOrigin={dataOrigin}
            activeScenario={activeScenario}
            onChangeScenario={setActiveScenario}
            bleError={bleError}
          />

          {activeTab === 'soc' && (
            <SocMonitorView
              latestPacket={latestPacket}
              history={history}
              alerts={alerts}
              thresholds={thresholds}
              onChangeThresholds={setThresholds}
              onResetThresholds={() => setThresholds(DEFAULT_THRESHOLDS)}
              onClearAlerts={() => setAlerts([])}
              matrixPixels={matrixPixels}
              onToggleMatrixPixel={handleToggleMatrixPixel}
              onApplyMatrixPreset={syncMatrix}
              prediction={prediction}
              threatHistory={threatHistory}
              bleConnected={connectionMode === 'ble'}
            />
          )}

          {activeTab === 'twin3d' && (
            <Board3DSceneView
              latestPacket={latestPacket}
              matrixPixels={matrixPixels}
              thresholds={thresholds}
            />
          )}

          {activeTab === 'ailab' && (
            <AiLabView
              history={history}
              dataset={dataset}
              onAddSample={(s) => setDataset((prev) => [...prev, s])}
              onDeleteSample={(id) =>
                setDataset((prev) => prev.filter((item) => item.id !== id))
              }
              onResetBaseline={() => setDataset(createBaselineCyberDataset())}
              onClearDataset={() => setDataset([])}
              prediction={prediction}
              kNeighbors={kNeighbors}
              onChangeK={setKNeighbors}
              telemetryActive={connectionMode !== 'disconnected'}
            />
          )}

          {activeTab === 'game' && (
            <CyberGamesHubView
              latestPacket={latestPacket}
              onSyncMatrix={syncMatrix}
            />
          )}

          {activeTab === 'optical' && (
            <SensorsGuideView
              latestPacket={latestPacket}
              thresholds={thresholds}
              telemetryActive={connectionMode !== 'disconnected'}
            />
          )}

          {activeTab === 'audit' && (
            <AuditCopilotView
              latestPacket={latestPacket}
              history={history}
              dataOrigin={dataOrigin}
              prediction={prediction}
              alerts={alerts}
              telemetryActive={connectionMode !== 'disconnected'}
            />
          )}

          {activeTab === 'chat' && (
            <GeminiChatView
              latestPacket={latestPacket}
              prediction={prediction}
              alerts={alerts}
            />
          )}

          {activeTab === 'firmware' && <FirmwareGuideView />}
        </main>
      </div>
    </div>
  );
}
