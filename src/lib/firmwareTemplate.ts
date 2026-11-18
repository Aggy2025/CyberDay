export interface MatrixPreset {
  id: string;
  name: string;
  description: string;
  pixels: number[];
}

export const CYBER_MATRIX_PRESETS: MatrixPreset[] = [
  {
    id: 'shield',
    name: 'Escudo Seguro',
    description: 'Estado nominal sin anomalías físicas.',
    pixels: [
      1, 1, 1, 1, 1,
      1, 0, 1, 0, 1,
      1, 1, 1, 1, 1,
      0, 1, 1, 1, 0,
      0, 0, 1, 0, 0,
    ],
  },
  {
    id: 'alert',
    name: 'Alerta Crítica (!)',
    description: 'Señal de manipulación o brecha activa.',
    pixels: [
      0, 0, 1, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 1, 0, 0,
    ],
  },
  {
    id: 'lock',
    name: 'Candado Cerrado',
    description: 'Gabinete asegurado y MFA verificado.',
    pixels: [
      0, 1, 1, 1, 0,
      0, 1, 0, 1, 0,
      1, 1, 1, 1, 1,
      1, 1, 0, 1, 1,
      1, 1, 1, 1, 1,
    ],
  },
  {
    id: 'breach',
    name: 'Intrusión (X)',
    description: 'Indicador de ataque físico o canal lateral.',
    pixels: [
      1, 0, 0, 0, 1,
      0, 1, 0, 1, 0,
      0, 0, 1, 0, 0,
      0, 1, 0, 1, 0,
      1, 0, 0, 0, 1,
    ],
  },
  {
    id: 'optical',
    name: 'Pulso Óptico',
    description: 'Monitoreo activo del sensor de luz LTR-303.',
    pixels: [
      0, 0, 1, 0, 0,
      0, 1, 1, 1, 0,
      1, 1, 0, 1, 1,
      0, 1, 1, 1, 0,
      0, 0, 1, 0, 0,
    ],
  },
  {
    id: 'clear',
    name: 'Apagar Matriz',
    description: 'Apaga los 25 LEDs de la matriz.',
    pixels: Array(25).fill(0),
  },
];

export const CYBER_FIRMWARE_CODE_PY = `"""
===============================================================================
PROYECTO: IDEASENSE EXPLORER · IA & CIBERSEGURIDAD (Universidad CENFOTEC)
Firmware CircuitPython 10.x para IdeaBoard (ESP32) + IdeaSense Explorer
===============================================================================
- Transmisión BLE Nordic UART (NUS) a 25 Hz (40 ms).
- Lee IMU (LSM6DS), Temp/Humedad (SHT30), Luz (LTR-303) y botones A/B/C.
- Incluye bitmask 'sim' (0 = todos los sensores físicos reales).
- Recibe comandos JSON {"cmd": "matrix", "pixels": [25 ints]} para alertas en vivo.
"""
import time
import board
import json
from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

from ideaboard import IdeaBoard
from ideasense import IdeaSense

ib = IdeaBoard()
idea = IdeaSense()

ble = BLERadio()
ble.name = "IdeaSense-CyberSec"
uart = UARTService()
advertisement = ProvideServicesAdvertisement(uart)

TELEMETRY_INTERVAL = 0.04  # 25 Hz
last_tx = 0.0
was_connected = False

SHIELD_PATTERN = [
    1, 1, 1, 1, 1,
    1, 0, 1, 0, 1,
    1, 1, 1, 1, 1,
    0, 1, 1, 1, 0,
    0, 0, 1, 0, 0,
]

def update_matrix(pixels):
    try:
        idea.matrix.fill(0)
        for row in range(5):
            for col in range(5):
                idx = row * 5 + col
                if idx < len(pixels) and pixels[idx] == 1:
                    idea.matrix[col, row] = 1
        idea.matrix.show()
    except Exception as err:
        print("Matrix error:", err)

def handle_command(raw_line):
    global TELEMETRY_INTERVAL
    try:
        data = json.loads(raw_line)
        cmd = data.get("cmd", "")
        if cmd == "matrix":
            update_matrix(data.get("pixels", []))
        elif cmd == "config":
            ms = int(data.get("interval", 40))
            TELEMETRY_INTERVAL = max(0.02, min(2.0, ms / 1000.0))
    except Exception:
        pass

update_matrix(SHIELD_PATTERN)
ble.start_advertising(advertisement)
print("[CYBERSEC] IdeaSense BLE listo:", ble.name)

while True:
    connected = ble.connected
    if connected and not was_connected:
        ib.pixel = (0, 180, 90)
        update_matrix(SHIELD_PATTERN)
    elif not connected and was_connected:
        ib.pixel = (180, 80, 0)
        ble.start_advertising(advertisement)
    was_connected = connected

    if connected and uart.in_waiting:
        line = uart.readline().decode("utf-8").strip()
        if line:
            handle_command(line)

    now = time.monotonic()
    if connected and (now - last_tx >= TELEMETRY_INTERVAL):
        last_tx = now
        sim_mask = 0
        try:
            temp = round(float(idea.temp), 1)
            hum = round(float(idea.humid), 1)
        except Exception:
            temp, hum = 25.0, 50.0
            sim_mask |= 1

        try:
            ax, ay, az = idea.accel
            gx, gy, gz = idea.gyro
        except Exception:
            ax, ay, az, gx, gy, gz = 0.0, 0.0, 9.8, 0.0, 0.0, 0.0
            sim_mask |= 2

        try:
            lux = int(idea.light)
        except Exception:
            lux = 250
            sim_mask |= 4

        held = getattr(idea, "held", [False, False, False])
        ba = 1 if len(held) > 0 and held[0] else 0
        bb = 1 if (len(held) > 1 and held[1]) or (len(held) > 2 and held[2]) else 0

        packet = {
            "t": temp,
            "h": hum,
            "l": lux,
            "ax": round(ax / 9.81, 3),
            "ay": round(ay / 9.81, 3),
            "az": round(az / 9.81, 3),
            "gx": round(gx * 57.2958, 1),
            "gy": round(gy * 57.2958, 1),
            "gz": round(gz * 57.2958, 1),
            "ba": ba,
            "bb": bb,
            "sim": sim_mask,
        }
        try:
            uart.write((json.dumps(packet) + "\\n").encode("utf-8"))
        except Exception:
            pass

    time.sleep(0.01)
`;
