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
- Inicialización tolerante a fallos I2C (evita crash si 0x70 no responde).
- Escanea el bus Qwiic/I2C e informa direcciones detectadas por consola serie.
- Transmisión BLE Nordic UART (NUS) a 25 Hz (40 ms).
- Lee IMU (LSM6DS 0x6A), Temp/Hum (SHT30 0x44), Luz (LTR-303 0x29) y botones A/B/C.
- Incluye bitmask 'sim' (0 = todo real; 1=T/H, 2=IMU, 4=Luz simulados).
===============================================================================
"""
import time
import board
import busio
import json
from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import Advertisement, ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

ib = None
idea = None
use_ideasense_lib = False
i2c = None
hw_addresses = []

try:
    from ideaboard import IdeaBoard
    ib = IdeaBoard()
except Exception as err:
    print("[HW WARN] IdeaBoard no inicializó:", err)

try:
    from ideasense import IdeaSense
    idea = IdeaSense()
    use_ideasense_lib = True
    print("[HW] IdeaSense Explorer detectada correctamente.")
except Exception as err:
    print("[HW WARN] IdeaSense() falló (modo respaldo activo):", err)

def init_i2c_fallback():
    global i2c, hw_addresses
    for owner in (idea, ib):
        for attr in ("i2c", "_i2c", "i2c_bus"):
            cand = getattr(owner, attr, None) if owner else None
            if cand is not None and hasattr(cand, "try_lock"):
                i2c = cand
                break
        if i2c:
            break

    if i2c is None:
        for maker in (lambda: board.I2C(), lambda: busio.I2C(board.SCL, board.SDA, frequency=400000)):
            try:
                i2c = maker()
                break
            except Exception:
                pass

    if not i2c:
        print("[I2C WARN] Bus I2C no disponible.")
        return

    while not i2c.try_lock():
        pass
    try:
        hw_addresses = i2c.scan()
    finally:
        i2c.unlock()

    print("[I2C] Direcciones detectadas:", [hex(a) for a in hw_addresses])
    if 0x70 not in hw_addresses and not use_ideasense_lib:
        print("[I2C WARN] No se encontró 0x70 (HT16K33). Revisa el cable Qwiic/STEMMA QT hacia IdeaSense Explorer.")

    if not use_ideasense_lib:
        for addr, cmds in (
            (0x70, (bytes([0x21]), bytes([0x81]), bytes([0xEF]))),
            (0x6A, (bytes([0x10, 0x40]), bytes([0x11, 0x40]))),
            (0x29, (bytes([0x80, 0x01]),)),
        ):
            if addr in hw_addresses:
                try:
                    while not i2c.try_lock():
                        pass
                    try:
                        for c in cmds:
                            i2c.writeto(addr, c)
                    finally:
                        i2c.unlock()
                except Exception:
                    pass

init_i2c_fallback()

ble = BLERadio()
ble.name = "IdeaSense-CyberSec"
uart = UARTService()
advertisement = ProvideServicesAdvertisement(uart)
scan_response = Advertisement()
scan_response.complete_name = "IdeaSense-CyberSec"

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

def set_pixel(r, g, b):
    if ib:
        try:
            ib.pixel = (r, g, b)
        except Exception:
            pass

def update_matrix(pixels):
    if use_ideasense_lib and idea:
        try:
            idea.matrix.fill(0)
            for row in range(5):
                for col in range(5):
                    idx = row * 5 + col
                    if idx < len(pixels) and pixels[idx] == 1:
                        idea.matrix[col, row] = 1
            idea.matrix.show()
            return
        except Exception as err:
            print("Matrix error:", err)
    if i2c and 0x70 in hw_addresses:
        try:
            ram = [0] * 16
            for row in range(5):
                row_bits = 0
                for col in range(5):
                    idx = row * 5 + col
                    if idx < len(pixels) and pixels[idx] == 1:
                        row_bits |= (1 << col)
                ram[row * 2] = row_bits
            while not i2c.try_lock():
                pass
            try:
                i2c.writeto(0x70, bytes([0x00] + ram))
            finally:
                i2c.unlock()
        except Exception:
            pass

def read_env():
    if use_ideasense_lib and idea:
        try:
            return round(float(idea.temp), 1), round(float(idea.humid), 1), 0
        except Exception:
            pass
    if i2c and 0x44 in hw_addresses:
        try:
            while not i2c.try_lock():
                pass
            try:
                i2c.writeto(0x44, bytes([0x2C, 0x06]))
                time.sleep(0.015)
                buf = bytearray(6)
                i2c.readfrom_into(0x44, buf)
            finally:
                i2c.unlock()
            raw_t = (buf[0] << 8) | buf[1]
            raw_h = (buf[3] << 8) | buf[4]
            return round(-45.0 + 175.0 * raw_t / 65535.0, 1), round(100.0 * raw_h / 65535.0, 1), 0
        except Exception:
            pass
    return 25.0, 50.0, 1

def read_imu():
    if use_ideasense_lib and idea:
        try:
            ax, ay, az = idea.accel
            gx, gy, gz = idea.gyro
            return (
                round(ax / 9.81, 3), round(ay / 9.81, 3), round(az / 9.81, 3),
                round(gx * 57.2958, 1), round(gy * 57.2958, 1), round(gz * 57.2958, 1),
                0,
            )
        except Exception:
            pass
    if i2c and 0x6A in hw_addresses:
        try:
            buf = bytearray(12)
            while not i2c.try_lock():
                pass
            try:
                i2c.writeto_then_readfrom(0x6A, bytes([0x22]), buf)
            finally:
                i2c.unlock()
            def to_s16(lo, hi):
                v = (hi << 8) | lo
                return v - 65536 if v > 32767 else v
            gx = round(to_s16(buf[0], buf[1]) * 0.00875, 1)
            gy = round(to_s16(buf[2], buf[3]) * 0.00875, 1)
            gz = round(to_s16(buf[4], buf[5]) * 0.00875, 1)
            ax = round(to_s16(buf[6], buf[7]) * 0.000061, 3)
            ay = round(to_s16(buf[8], buf[9]) * 0.000061, 3)
            az = round(to_s16(buf[10], buf[11]) * 0.000061, 3)
            return ax, ay, az, gx, gy, gz, 0
        except Exception:
            pass
    return 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 2

def read_light():
    if use_ideasense_lib and idea:
        try:
            return int(idea.light), 0
        except Exception:
            pass
    if i2c and 0x29 in hw_addresses:
        try:
            buf = bytearray(4)
            while not i2c.try_lock():
                pass
            try:
                i2c.writeto_then_readfrom(0x29, bytes([0x88]), buf)
            finally:
                i2c.unlock()
            return int((buf[3] << 8) | buf[2]), 0
        except Exception:
            pass
    return 250, 4

def read_buttons():
    if use_ideasense_lib and idea:
        try:
            held = getattr(idea, "held", [False, False, False])
            ba = 1 if len(held) > 0 and held[0] else 0
            bb = 1 if (len(held) > 1 and held[1]) or (len(held) > 2 and held[2]) else 0
            return ba, bb
        except Exception:
            pass
    if i2c and 0x70 in hw_addresses:
        try:
            kd = bytearray(6)
            while not i2c.try_lock():
                pass
            try:
                i2c.writeto_then_readfrom(0x70, bytes([0x40]), kd)
            finally:
                i2c.unlock()
            mask = kd[0]
            return (1 if (mask & (1 << 2)) else 0), (1 if (mask & ((1 << 3) | (1 << 4))) else 0)
        except Exception:
            pass
    return 0, 0

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
try:
    ble.start_advertising(advertisement, scan_response)
except Exception:
    ble.start_advertising(advertisement)
print("[CYBERSEC] IdeaSense BLE listo:", ble.name)

while True:
    connected = ble.connected
    if connected and not was_connected:
        set_pixel(0, 180, 90)
        update_matrix(SHIELD_PATTERN)
    elif not connected and was_connected:
        set_pixel(180, 80, 0)
        try:
            ble.start_advertising(advertisement, scan_response)
        except Exception:
            ble.start_advertising(advertisement)
    was_connected = connected

    if connected and uart.in_waiting:
        line = uart.readline().decode("utf-8").strip()
        if line:
            handle_command(line)

    now = time.monotonic()
    if connected and (now - last_tx >= TELEMETRY_INTERVAL):
        last_tx = now
        temp, hum, s_env = read_env()
        ax, ay, az, gx, gy, gz, s_imu = read_imu()
        lux, s_lux = read_light()
        ba, bb = read_buttons()
        sim_mask = s_env | s_imu | s_lux

        packet = {
            "t": temp,
            "h": hum,
            "l": lux,
            "ax": ax,
            "ay": ay,
            "az": az,
            "gx": gx,
            "gy": gy,
            "gz": gz,
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

