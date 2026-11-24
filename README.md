# IdeaSense CyberLab · IA y Ciberseguridad

Plataforma educativa de **seguridad física IoT, telemetría Bluetooth LE (25 Hz), Edge AI (`k-NN`) y análisis de incidentes con Gemini**, diseñada para el **MakerLab** y el evento **Día de AI & Cybersecurity** de la **Universidad CENFOTEC**.

Conecta en tiempo real una **IdeaBoard (`ESP32-WROOM-32E`)** junto con la placa de sensores **IdeaSense Explorer** (o utiliza el **Modo Demo** integrado en el navegador si no tienes el hardware físico conectado) para demostrar cómo los microcontroladores y sensores actúan como primera línea de defensa física y fuente de datos para Inteligencia Artificial en el borde.

---

## Enlaces en vivo para probar

| Entorno | URL | Qué incluye |
| :--- | :--- | :--- |
| **Aplicación completa (Cloud Run · Recomendado)** | [https://ais-pre-6hpzxi4hy7egq3dgzqfpum-427410295521.us-west2.run.app/](https://ais-pre-6hpzxi4hy7egq3dgzqfpum-427410295521.us-west2.run.app/) | Todas las funciones: Monitor SOC, Gemelo 3D, Laboratorio k-NN, Juegos, Diccionario Maker, Web Bluetooth **y** análisis/chat con **Gemini** (con servidor Node/Express). |
| **Versión estática (GitHub Pages)** | [https://aggy2025.github.io/CyberDay/](https://aggy2025.github.io/CyberDay/) | Todas las funciones locales del navegador (Modo Demo, Web Bluetooth, Gemelo 3D, Laboratorio k-NN, Juegos, Diccionario Maker y Firmware). *Nota: sin backend `/api/*` para Gemini.* |

---

## Tabla de contenidos

1. [Enlaces en vivo para probar](#enlaces-en-vivo-para-probar)
2. [¿Qué demuestra este proyecto?](#-qué-demuestra-este-proyecto)
3. [Arquitectura de Hardware: IdeaBoard vs IdeaSense Explorer](#-arquitectura-de-hardware-ideaboard-vs-ideasense-explorer)
4. [Módulos de la aplicación web](#-módulos-de-la-aplicación-web)
5. [Protocolo BLE y formato de telemetría (25 Hz)](#-protocolo-ble-y-formato-de-telemetría-25-hz)
6. [Instalación y ejecución local](#-instalación-y-ejecución-local)
7. [Carga del firmware CircuitPython (`code.py`) en la IdeaBoard](#-carga-del-firmware-circuitpython-codepy-en-la-ideaboard)
8. [Pruebas automatizadas y verificación](#-pruebas-automatizadas-y-verificación)
9. [Estructura del proyecto](#-estructura-del-proyecto)
10. [Referencias de hardware](#-referencias-de-hardware)

---

## ¿Qué demuestra este proyecto?

En ciberseguridad, los ataques no solo ocurren por red: también existen vectores físicos como la **apertura no autorizada de gabinetes**, el **sabotaje o traslado de equipos (MITRE ATT&CK T1200)**, los **canales encubiertos ópticos o térmicos**, y la **fuerza bruta sobre controles locales**.

**IdeaSense CyberLab** permite experimentar todo el ciclo completo:
- **Sensado físico en el borde:** adquisición a `25 Hz` de movimiento, luz, temperatura, humedad y botones táctiles sobre bus I2C/Qwiic.
- **Detección híbrida:** combinación de reglas determinísticas de umbral en tiempo real + un modelo ligero de Machine Learning (**`k-NN` de 16 dimensiones** con **Z-Score**).
- **Respuesta bidireccional en hardware:** sincronización de la **matriz LED 5×5 (`HT16K33`)** y el **LED RGB NeoPixel (`IO02`)** desde el navegador hacia la placa física.
- **Forense y asistencia con IA generativa:** exportación CSV con trazabilidad del origen de datos (`REAL_BLE`, `DEMO_SIMULADO` o `FIRMWARE_SIMULADO`) y diagnóstico con **Google Gemini** desde el backend.

---

## Arquitectura de Hardware: IdeaBoard vs IdeaSense Explorer

El proyecto se apoya en el ecosistema abierto [`Universidad-Cenfotec/IdeaSense`](https://github.com/Universidad-Cenfotec/IdeaSense) y la placa **IdeaBoard** de **CRCibernética**:

| Placa | Rol Maker | Especificaciones clave | Uso en este CyberLab |
| :--- | :--- | :--- | :--- |
| **IdeaBoard** | **Microcontrolador (MCU)** — *El cerebro* | Módulo `ESP32-WROOM-32E` (Dual-Core, Wi-Fi + BLE), puente serial USB-C `CH340G`, NeoPixel `WS2812B` en `IO02` (`ib.pixel`), puerto Qwiic 3.3 V, doble Puente H (`800 mA/ch`), bornera `Vin` y pines GPIO/ADC. | Ejecuta `code.py` en CircuitPython, escanea el bus I2C a 400 kHz, transmite telemetría JSON por BLE NUS a 25 Hz y refleja el enlace BLE en el NeoPixel `IO02`. |
| **IdeaSense Explorer** | **PCB de Sensores e Interfaz** — *Los sentidos* | PCB negra con montaje M3, doble conector Qwiic/STEMMA QT (3.3 V) y 4 dispositivos digitales I2C controlados con `ideasense.py`. | Captura telemetría física (luz, IMU, temperatura/humedad), lee los botones `A`, `B` y `C`, y muestra íconos de estado en la matriz LED SMD 5×5. |

### Mapa exacto de chips y direcciones I2C

| Componente físico | Chip / Pin | Dirección I2C / Pin | Rol en IdeaSense CyberLab |
| :--- | :--- | :--- | :--- |
| **Sensor Óptico** | `LTR-303` (Visible + IR) | `0x29` | Detecta apertura de gabinete, obstrucción/ceguera (`Sensor Blinding`) e inyecciones o canales encubiertos de luz (`l` en cuentas). Controla *Decodificador Óptico*. |
| **Unidad Inercial 6-DoF (IMU)** | `LSM6DS3TR-C` | `0x6A` | Acelerómetro (`m/s²` → `g`) y giroscopio (`rad/s` → `dps`). Detecta sabotaje/traslado, mueve el Gemelo 3D y controla *Firewall Interceptor*. |
| **Sensor Ambiental** | `SHT30` | `0x44` | Temperatura (`°C`) y humedad relativa (`% HR`). Detecta sobrecalentamiento, fallos HVAC y riesgo de condensación (punto de rocío). |
| **Matriz LED 5×5 y Botones A/B/C** | `HT16K33` | `0x70` | Multiplexa la matriz 5×5 (`cmd: "matrix"`) y escanea por keyscan los 3 pulsadores (`A → ba`, `B o C → bb`) para MFA y detección de fuerza bruta. |
| **LED de estado integrado** | `WS2812B` (`ib.pixel`) | `IO02` (IdeaBoard) | Verde al conectar BLE, ámbar en espera/desconexión; también se representa en el Gemelo 3D. |
| **Capacidades libres para ampliar** | Doble Puente H (`MOTOR 1/2`), GPIO/ADC/Touch, `Vin`, Wi-Fi | — | No se usan en esta web, pero permiten expandir prototipos MakerLab con cerraduras motorizadas, ventiladores reales, relés o zumbadores. |

---

## Módulos de la aplicación web

1. **Monitor SOC (`soc`):**
   - Osciloscopio en tiempo real (IMU, Luz `LTR-303`, Temperatura `SHT30`), vector de estado, umbrales configurables de alerta, bitácora de incidentes exportable en CSV/JSON, **Tendencia Temporal de Amenaza IA** y control bidireccional de la matriz LED 5×5.
   - Esquema SVG interactivo de ambas placas conectadas por Qwiic.
2. **Gemelo Digital 3D (`twin3d`):**
   - Escena **Three.js** interactiva con los modelos 3D de la **IdeaSense Explorer** y la **IdeaBoard** enlazadas por cable Qwiic, inclinándose con el IMU real o simulado y reflejando LEDs de matriz, NeoPixel `IO02` y alertas ópticas/térmicas.
3. **Laboratorio de Edge AI (`ailab`):**
   - Clasificador **`k-NN` (k-Nearest Neighbors)** sobre un vector de **16 características** (media y desviación estándar de `ax, ay, az, gx, gy, gz, l, t` en ventanas de 30 muestras) con cálculo de **Z-Score** respecto a la línea base nominal.
   - Permite grabar nuevas ráfagas desde hardware o simulador, ajustar `k` y exportar el modelo entrenado como código Python listo para CircuitPython (`ideasense_cyber_knn.py`).
4. **Juegos CyberLab (`game`):**
   - **1. Firewall Interceptor:** Defensa de red en canvas 2D moviendo el escudo con el IMU o los botones `A` y `B/C` para bloquear DDoS/Phishing y dejar pasar TLS legítimo.
   - **2. Decodificador Óptico:** Demostración interactiva de exfiltración *Air-Gap* OOK mediante pulsos de luz capturados con el `LTR-303` o botón físico.
   - **3. Defensa MFA:** Reto de presencia humana y control de tasa (*rate limiting*) usando secuencias en botones físicos para frenar fuerza bruta.
5. **Guía de Sensores y Diccionario Maker (`optical`):**
   - **0. Diccionario Maker:** Explica de forma didáctica la diferencia entre **IdeaBoard (MCU)** e **IdeaSense Explorer (PCB)**, incluye un **mapa filtrable** de qué hardware se usa activamente en este ejemplo vs. qué pines/puente H quedan libres para expandir, y un **glosario buscable** de conceptos Maker, I2C, BLE y Edge AI.
   - **1–4. Simuladores físicos interactivos:** Diagramas SVG manipulables en vivo o en modo manual para **Luz (`LTR-303` vs concepto `LDR`)**, **IMU (`LSM6DS3TR-C`)**, **Térmico (`SHT30`)** y **Botones MFA (`HT16K33`)**, acompañados de casos de uso reales para el MakerLab.
6. **Auditoría y Copiloto Gemini (`audit`):**
   - Grabador de sesiones forenses con descarga en CSV y análisis estructurado con Gemini (`POST /api/analyze-incident`) que devuelve nivel de riesgo, vector probable, indicadores, mitigaciones y regla sugerida en CircuitPython.
7. **Chat SOC Multi-Turno (`chat`):**
   - Asistente conversacional (`POST /api/chat`) con memoria de sesión, roles seleccionables (*Analista SOC IoT*, *Ingeniero CircuitPython*, *Mentor Día AI & Cyber*) e inyección opcional de la telemetría viva. Usa modelos gratuitos (`gemini-3.1-flash-lite` y `gemini-4-hydrogen` con fallback automático ante saturación).
8. **Firmware y Guía (`firmware`):**
   - Visor, copiador y descarga directa de `code.py`, instrucciones de carga vía **IdeaCode**, guión de demostración en 6 pasos para charlas/stands y 4 prototipos replicables en el MakerLab.

---

## Protocolo BLE y formato de telemetría (25 Hz)

El firmware utiliza el servicio estándar **Nordic UART Service (NUS)** compatible con **Web Bluetooth API** (Chrome / Edge):

- **Nombre del dispositivo BLE:** `IdeaSense-CyberSec`
- **Service UUID:** `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- **RX Characteristic (Navegador → ESP32):** `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- **TX Characteristic (ESP32 → Navegador):** `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

### Paquete TX (del ESP32 al navegador cada 40 ms)

```json
{
  "t": 25.4,
  "h": 54.0,
  "l": 290,
  "ax": 0.002,
  "ay": -0.004,
  "az": 0.998,
  "gx": 0.3,
  "gy": -0.2,
  "gz": 0.1,
  "ba": 0,
  "bb": 0,
  "sim": 0
}
```

- `t`, `h`: Temperatura (`°C`) y humedad relativa (`%`) del `SHT30`.
- `l`: Cuentas ópticas digitales del `LTR-303`.
- `ax, ay, az`: Aceleración en gravedad (`g`), convertida desde `m/s²` (`idea.accel / 9.81`).
- `gx, gy, gz`: Velocidad angular en grados por segundo (`dps`), convertida desde `rad/s` (`idea.gyro * 57.2958`).
- `ba`, `bb`: Estado de botones físicos (`ba` = botón `A`; `bb` = botón `B` o `C`).
- `sim`: Máscara de bits de transparencia (`0` = todos los sensores reales; bit `1` = T/H simulado, bit `2` = IMU simulado, bit `4` = Luz simulada si algún dispositivo I2C no respondió).

### Comandos RX (del navegador al ESP32)

- Actualizar matriz 5×5:
  ```json
  {"cmd": "matrix", "pixels": [1,1,1,1,1, 1,0,1,0,1, 1,1,1,1,1, 0,1,1,1,0, 0,0,1,0,0]}
  ```
- Ajustar intervalo de muestreo (en ms):
  ```json
  {"cmd": "config", "interval": 40}
  ```

---

## Instalación y ejecución local

### Requisitos previos
- **Node.js 20+** y `npm`
- Navegador basado en Chromium (**Google Chrome** o **Microsoft Edge**) sobre `localhost` o `HTTPS` si deseas usar **Web Bluetooth**.
- Una clave gratuita de **Gemini API** (opcional; solo necesaria para **Auditoría con Gemini** y **Chat SOC**).

### Pasos

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz (puedes tomar `.env.example` como base):
   ```env
   GEMINI_API_KEY="tu_api_key_de_google_ai_studio"
   PORT=3000
   ```
   > **Seguridad:** La clave `GEMINI_API_KEY` se consume exclusivamente desde el servidor Express (`server.ts`) en `/api/analyze-incident` y `/api/chat`; nunca se expone al navegador.

3. **Iniciar en desarrollo (Express + Vite en puerto 3000):**
   ```bash
   npm run dev
   ```
   Abre `http://localhost:3000`.

4. **Compilar y ejecutar en modo producción:**
   ```bash
   npm run build
   npm start
   ```

> **Nota sobre despliegue estático (GitHub Pages vs. servidor Node):**
> Toda la telemetría BLE, el Modo Demo, el Gemelo 3D, el Laboratorio k-NN, el Diccionario Maker y los 3 minijuegos funcionan 100 % en el navegador. Sin embargo, las rutas `/api/analyze-incident` y `/api/chat` requieren ejecutar `server.ts` (por ejemplo en Cloud Run o un servidor Node.js); en un hosting puramente estático como GitHub Pages, la app detectará automáticamente la ausencia del backend y mostrará un aviso claro sin romper el resto de la plataforma.

---

## Carga del firmware CircuitPython (`code.py`) en la IdeaBoard

Debido a que la **IdeaBoard** utiliza un módulo **`ESP32-WROOM-32E`** clásico con convertidor serial **`CH340G`**, no monta una unidad USB flash `CIRCUITPY` nativa; la carga de scripts se realiza por puerto serie web:

1. Conecta la **IdeaBoard** a la **IdeaSense Explorer** usando el cable **Qwiic / STEMMA QT** de 4 hilos (sin soldar).
2. Conecta la IdeaBoard a tu computadora por **USB-C**.
3. Abre **[IdeaCode](https://ideacode.crcibernetica.com/)** en Google Chrome o Microsoft Edge y enlaza el puerto serial de la placa.
4. Asegúrate de tener instalada la librería `ideasense.py` (desde [`Universidad-Cenfotec/IdeaSense`](https://github.com/Universidad-Cenfotec/IdeaSense)) y `ideaboard.py` en `/lib`, junto con las librerías BLE de Adafruit (`adafruit_ble`).
5. Descarga o copia `code.py` desde la pestaña **Firmware y Guía** de la aplicación web, guárdalo en la placa y presiona **`Ctrl+R`** para ejecutarlo.
6. En la consola serie verás el escaneo I2C (`[0x29, 0x44, 0x6A, 0x70]`). Si algún sensor falta, `code.py` **no colapsa** con `ValueError: No I2C device at address: 0x70`: activa un respaldo seguro y reporta qué canales están simulados en el campo `sim`.
7. El NeoPixel `IO02` pasará a **verde** cuando el navegador se conecte mediante **Conectar IdeaBoard**.

---

## Pruebas automatizadas y verificación

- **Verificación de tipos TypeScript:**
  ```bash
  npm run lint
  ```
- **Suite de pruebas unitarias (`node:test` vía `tsx`):**
  ```bash
  npx --yes tsx --test src/lib/*.test.ts
  ```
- **Compilación de producción:**
  ```bash
  npm run build
  ```

---

## Estructura del proyecto

```text
├── server.ts                        # Servidor Express + proxy seguro Gemini (/api/analyze-incident, /api/chat) + Vite middleware
├── index.html                       # Entrada HTML con metadatos SEO/OG
├── metadata.json                    # Metadatos del applet
├── package.json                     # Scripts y dependencias (React 19, Three.js, Recharts, Express, @google/genai)
└── src/
    ├── App.tsx                      # Estado global, bucle Demo 25 Hz, enlace BLE y enrutamiento de vistas
    ├── components/
    │   ├── SocMonitorView.tsx       # Panel SOC: osciloscopio, alertas, matriz 5×5 y tendencia IA
    │   ├── BoardSchematicSvg.tsx    # Esquema SVG en vivo de IdeaBoard + IdeaSense Explorer
    │   ├── Board3DSceneView.tsx     # Gemelo Digital 3D interactivo en Three.js
    │   ├── AiLabView.tsx            # Entrenamiento y prueba Edge AI (k-NN 16D + exportador Python)
    │   ├── CyberGamesHubView.tsx    # Hub de los 3 minijuegos controlados por hardware/simulador
    │   ├── FirewallGameView.tsx     # Juego 1: Firewall Interceptor
    │   ├── OpticalDecoderGame.tsx   # Juego 2: Decodificador Óptico Air-Gap
    │   ├── MfaBruteDefenseGame.tsx  # Juego 3: Defensa MFA Física
    │   ├── SensorsGuideView.tsx     # Contenedor de Diccionario Maker y 4 guías interactivas
    │   ├── MakerDictionarySection.tsx # Comparativa IdeaBoard/IdeaSense, mapa de uso y glosario buscable
    │   ├── OpticalSensorGuide.tsx   # Simulador LTR-303 (0x29) vs concepto LDR
    │   ├── ImuSensorGuide.tsx       # Simulador MEMS LSM6DS3TR-C (0x6A)
    │   ├── ThermalSensorGuide.tsx   # Simulador SHT30 (0x44) y punto de rocío
    │   ├── MfaButtonsGuide.tsx      # Simulador de botones A/B/C y keyscan HT16K33 (0x70)
    │   ├── AuditCopilotView.tsx     # Grabación forense CSV y diagnóstico con Gemini
    │   ├── GeminiChatView.tsx       # Chat SOC multi-turno con roles e inyección de telemetría
    │   ├── FirmwareGuideView.tsx    # Visor/descarga de code.py, guión de demo y proyectos MakerLab
    │   └── ...                      # TopHeader, SidebarNav, DataTransparencyBanner, ThreatTrendChart, AppFooter
    └── lib/
        ├── bleService.ts            # Cliente Web Bluetooth (Nordic UART Service TX/RX)
        ├── cyberEngine.ts           # Motor de telemetría simulada, alertas, k-NN 16D, Z-Score y exportadores CSV/JSON/Python
        ├── firmwareTemplate.ts      # Plantilla tolerante a fallos code.py y patrones de matriz 5×5
        ├── makerDictionary.ts       # Perfiles IdeaBoard/IdeaSense, mapa de uso y diccionario Maker
        ├── makerApplications.ts     # Casos de aplicación MakerLab en ciberseguridad e IA
        ├── cyberGamesEducation.ts   # Lógica de puntuación y fichas didácticas de los 3 minijuegos
        ├── opticalEducation.ts      # Cálculos físicos ópticos (LDR / LTR-303)
        ├── sensorsEducation.ts      # Métricas didácticas de IMU, SHT30 y MFA
        ├── apiUtils.ts              # Manejo seguro de respuestas API JSON/HTML
        └── *.test.ts                # Pruebas unitarias con node:test
```

---

## Referencias de hardware

- **Repositorio oficial IdeaSense (Universidad CENFOTEC):** [github.com/Universidad-Cenfotec/IdeaSense](https://github.com/Universidad-Cenfotec/IdeaSense)
- **IDE Web Serial para CircuitPython en IdeaBoard:** [ideacode.crcibernetica.com](https://ideacode.crcibernetica.com/)
- **Contexto académico:** MakerLab · **Universidad CENFOTEC** · *Día de AI & Cybersecurity*
