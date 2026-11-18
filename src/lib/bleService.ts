import type { TelemetryPacket } from './types';

// Nordic UART Service (NUS) UUIDs used by IdeaSense Explorer firmware (code.py)
const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write to ESP32
const NUS_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notifications from ESP32

export interface BleConnectionCallbacks {
  onPacket: (packet: TelemetryPacket) => void;
  onDisconnect: () => void;
  onError: (message: string) => void;
}

interface BluetoothDeviceLike {
  name?: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<BluetoothServerLike>;
    disconnect: () => void;
  };
  addEventListener: (event: string, cb: () => void) => void;
}

interface BluetoothServerLike {
  getPrimaryService: (uuid: string) => Promise<BluetoothServiceLike>;
}

interface BluetoothServiceLike {
  getCharacteristic: (uuid: string) => Promise<BluetoothCharacteristicLike>;
}

interface BluetoothCharacteristicLike {
  startNotifications: () => Promise<void>;
  addEventListener: (event: string, cb: (event: Event) => void) => void;
  writeValue: (data: BufferSource) => Promise<void>;
  value?: DataView;
}

export class IdeaSenseBleClient {
  private device: BluetoothDeviceLike | null = null;
  private rxCharacteristic: BluetoothCharacteristicLike | null = null;
  private rxBuffer = '';
  private decoder = new TextDecoder('utf-8');
  private encoder = new TextEncoder();

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getDeviceName(): string {
    return this.device?.name || 'IdeaBoard BLE';
  }

  public async connect(callbacks: BleConnectionCallbacks): Promise<string> {
    if (!this.isSupported()) {
      throw new Error(
        'Web Bluetooth no está disponible en este navegador. Use Chrome o Edge sobre HTTPS/localhost, o active el Modo Simulación.',
      );
    }

    const nav = navigator as unknown as {
      bluetooth: {
        requestDevice: (opts: unknown) => Promise<BluetoothDeviceLike>;
      };
    };

    const device = await nav.bluetooth.requestDevice({
      filters: [{ services: [NUS_SERVICE_UUID] }],
      optionalServices: [NUS_SERVICE_UUID],
    });

    this.device = device;
    device.addEventListener('gattserverdisconnected', () => {
      this.rxCharacteristic = null;
      callbacks.onDisconnect();
    });

    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService(NUS_SERVICE_UUID);
    const txChar = await service.getCharacteristic(NUS_TX_UUID);
    this.rxCharacteristic = await service.getCharacteristic(NUS_RX_UUID);

    txChar.addEventListener('characteristicvaluechanged', (evt: Event) => {
      const target = evt.target as unknown as BluetoothCharacteristicLike;
      if (!target.value) return;
      const chunk = this.decoder.decode(target.value, { stream: true });
      this.rxBuffer += chunk;
      const lines = this.rxBuffer.split('\n');
      this.rxBuffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        try {
          const parsed = JSON.parse(line) as Partial<TelemetryPacket>;
          const packet: TelemetryPacket = {
            t: Number(parsed.t ?? 0),
            h: Number(parsed.h ?? 0),
            l: Number(parsed.l ?? 0),
            ax: Number(parsed.ax ?? 0),
            ay: Number(parsed.ay ?? 0),
            az: Number(parsed.az ?? 1),
            gx: Number(parsed.gx ?? 0),
            gy: Number(parsed.gy ?? 0),
            gz: Number(parsed.gz ?? 0),
            ba: Number(parsed.ba ?? 0),
            bb: Number(parsed.bb ?? 0),
            sim: typeof parsed.sim === 'number' ? parsed.sim : undefined,
            ts: Date.now(),
          };
          callbacks.onPacket(packet);
        } catch {
          // Ignore malformed partial BLE frames
        }
      }
    });

    await txChar.startNotifications();
    return this.getDeviceName();
  }

  public async sendMatrix(pixels: number[]): Promise<void> {
    if (!this.rxCharacteristic) return;
    const payload = JSON.stringify({ cmd: 'matrix', pixels: pixels.slice(0, 25) }) + '\n';
    await this.rxCharacteristic.writeValue(this.encoder.encode(payload));
  }

  public async sendConfig(intervalMs: number): Promise<void> {
    if (!this.rxCharacteristic) return;
    const payload = JSON.stringify({ cmd: 'config', interval: intervalMs }) + '\n';
    await this.rxCharacteristic.writeValue(this.encoder.encode(payload));
  }

  public disconnect(): void {
    try {
      if (this.device?.gatt?.connected) {
        this.device.gatt.disconnect();
      }
    } catch {
      // Ignore disconnect cleanup error
    }
    this.rxCharacteristic = null;
    this.rxBuffer = '';
  }
}
