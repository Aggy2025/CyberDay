export type HardwareBoardRole = 'ideaboard' | 'ideasense';

export type UsageStatus = 'active' | 'expansion';

export interface HardwareComponentItem {
  id: string;
  board: HardwareBoardRole;
  name: string;
  chipOrPin: string;
  status: UsageStatus;
  telemetryField: string;
  description: string;
  cyberLabUsage: string;
}

export type DictionaryCategory = 'hardware' | 'protocols' | 'firmware' | 'cyber_ai';

export interface MakerTermEntry {
  id: string;
  term: string;
  category: DictionaryCategory;
  categoryLabel: string;
  shortTag: string;
  definition: string;
  inThisProject: string;
}

export const BOARD_PROFILES: Record<
  HardwareBoardRole,
  {
    name: string;
    subtitle: string;
    origin: string;
    roleAnalogy: string;
    summary: string;
    programmingNote: string;
    specs: Array<{ label: string; value: string }>;
  }
> = {
  ideaboard: {
    name: 'IdeaBoard',
    subtitle: 'Microcontrolador (MCU) · El cerebro que procesa y comunica',
    origin: 'CRCibernética · Costa Rica',
    roleAnalogy: 'Microcontrolador programable (ESP32-WROOM-32E)',
    summary:
      'Es la tarjeta principal de cómputo embebido. Ejecuta el código CircuitPython (code.py), lee los sensores conectados por Qwiic, evalúa estados y transmite la telemetría por Bluetooth Low Energy (BLE) hacia el navegador web.',
    programmingNote:
      'Usa puente serial USB-C (CH340G), por lo que se programa desde IdeaCode (ideacode.crcibernetica.com) o IdeaScratch en Chrome/Edge, sin requerir unidad flash USB nativa.',
    specs: [
      { label: 'Chip central', value: 'ESP32-WROOM-32E (Dual-Core + Wi-Fi + BLE)' },
      { label: 'LED de estado', value: 'NeoPixel RGB WS2812B integrado en IO02 (ib.pixel)' },
      { label: 'Puertos y potencia', value: 'Qwiic 3.3V, USB-C, bornera Vin y doble Puente H (800 mA)' },
      { label: 'Lenguaje', value: 'CircuitPython + librería ideaboard.py' },
    ],
  },
  ideasense: {
    name: 'IdeaSense Explorer',
    subtitle: 'PCB de Sensores e Interfaz · Los sentidos y matriz LED',
    origin: 'Universidad CENFOTEC & CRCibernética',
    roleAnalogy: 'Placa de circuito impreso (PCB) de expansión I2C / Qwiic',
    summary:
      'Es una tarjeta de sensores diseñada para conectarse sin soldaduras a la IdeaBoard mediante un cable Qwiic de 4 hilos. Reúne cuatro dispositivos digitales sobre el mismo bus I2C para medir movimiento, luz, temperatura, humedad e interacción física.',
    programmingNote:
      'Se controla con la librería oficial ideasense.py del repositorio Universidad-Cenfotec/IdeaSense, con direcciones I2C dedicadas: 0x29, 0x44, 0x6A y 0x70.',
    specs: [
      { label: 'Sensor óptico', value: 'LTR-303 (I2C 0x29) · Luz visible + IR en cuentas' },
      { label: 'Unidad inercial (IMU)', value: 'LSM6DS3TR-C (I2C 0x6A) · Acelerómetro + Giroscopio 6-DoF' },
      { label: 'Sensor ambiental', value: 'SHT30 (I2C 0x44) · Temperatura (°C) y Humedad (% HR)' },
      { label: 'Matriz y botones', value: 'HT16K33 (I2C 0x70) · Matriz LED 5×5 SMD y botones A, B, C' },
    ],
  },
};

export const HARDWARE_COMPONENT_MAP: HardwareComponentItem[] = [
  {
    id: 'esp32-ble',
    board: 'ideaboard',
    name: 'Módulo ESP32-WROOM-32E + Radio BLE',
    chipOrPin: 'CPU Dual-Core · Nordic UART Service (NUS)',
    status: 'active',
    telemetryField: 'JSON 25 Hz (TX/RX BLE)',
    description:
      'Microcontrolador encargado de muestrear el bus I2C cada 40 ms y enviar paquetes JSON al navegador vía Web Bluetooth.',
    cyberLabUsage:
      'Actúa como nodo sensor autónomo en Monitor SOC, Gemelo 3D, Laboratorio IA y los 3 minijuegos CyberLab.',
  },
  {
    id: 'ws2812-io02',
    board: 'ideaboard',
    name: 'LED RGB NeoPixel integrado',
    chipOrPin: 'WS2812B · Pin IO02 (ib.pixel)',
    status: 'active',
    telemetryField: 'Estado visual local',
    description:
      'Diodo RGB direccionable montado en el centro de la IdeaBoard para retroalimentación inmediata sin pantalla.',
    cyberLabUsage:
      'En code.py se enciende verde al conectar por BLE y ámbar al desconectarse; también se refleja en el Gemelo 3D.',
  },
  {
    id: 'qwiic-port',
    board: 'ideaboard',
    name: 'Puerto Qwiic / STEMMA QT (I2C)',
    chipOrPin: '4 hilos (GND, 3.3V, SDA, SCL)',
    status: 'active',
    telemetryField: 'Bus I2C @ 400 kHz',
    description:
      'Conector polarizado que enlaza alimentación regulada de 3.3 V y líneas de datos I2C entre IdeaBoard e IdeaSense.',
    cyberLabUsage:
      'Transporta todas las lecturas de los 4 chips de la IdeaSense Explorer sin necesidad de protoboard ni soldadura.',
  },
  {
    id: 'imu-lsm6ds',
    board: 'ideasense',
    name: 'IMU 6-DoF (Acelerómetro + Giroscopio)',
    chipOrPin: 'LSM6DS3TR-C · I2C 0x6A',
    status: 'active',
    telemetryField: 'ax, ay, az (g) · gx, gy, gz (dps)',
    description:
      'Mide aceleración lineal en m/s² y velocidad angular en rad/s; code.py los convierte a gravedad (g) y grados/s (dps).',
    cyberLabUsage:
      'Detecta sabotaje físico (MITRE T1200), inclina el Gemelo 3D, aporta 12 variables al modelo k-NN y controla Firewall Interceptor.',
  },
  {
    id: 'light-ltr303',
    board: 'ideasense',
    name: 'Sensor de Luz Digital Visible + IR',
    chipOrPin: 'LTR-303 · I2C 0x29',
    status: 'active',
    telemetryField: 'l (cuentas ópticas)',
    description:
      'Fotodiodo digital calibrado en bus I2C que reporta intensidad luminosa en cuentas numéricas directas.',
    cyberLabUsage:
      'Detecta apertura de gabinetes, bloqueo/ceguera del sensor y pulsos ópticos encubiertos; alimenta el juego Decodificador Óptico.',
  },
  {
    id: 'env-sht30',
    board: 'ideasense',
    name: 'Sensor Ambiental CMOS (Temp / Humedad)',
    chipOrPin: 'SHT30 · I2C 0x44',
    status: 'active',
    telemetryField: 't (°C) · h (% HR)',
    description:
      'Integra elemento bandgap térmico y celda capacitiva de humedad calibrados de fábrica en el bus I2C.',
    cyberLabUsage:
      'Identifica anomalías térmicas, sobrecarga por fuerza bruta o fallos de climatización (HVAC) y riesgo de condensación.',
  },
  {
    id: 'matrix-ht16k33',
    board: 'ideasense',
    name: 'Matriz LED SMD 5×5 + Controlador',
    chipOrPin: 'HT16K33 · I2C 0x70',
    status: 'active',
    telemetryField: 'RX cmd: "matrix" (25 bits)',
    description:
      'Controlador I2C que multiplexa los 25 LEDs en cuadrícula 5×5 directamente sobre la PCB IdeaSense Explorer.',
    cyberLabUsage:
      'Recibe comandos bidireccionales desde el navegador para dibujar Escudo, Alerta (!), Candado o X en el hardware real.',
  },
  {
    id: 'buttons-abc',
    board: 'ideasense',
    name: 'Botones Táctiles Físicos A, B y C',
    chipOrPin: 'HT16K33 Keyscan · I2C 0x70',
    status: 'active',
    telemetryField: 'ba (Botón A) · bb (Botón B o C)',
    description:
      'Tres pulsadores físicos en la parte inferior de la IdeaSense Explorer leídos por escaneo matricial del HT16K33 (idea.held).',
    cyberLabUsage:
      'Validan presencia humana MFA, detectan ráfagas de fuerza bruta en ventana de 3 s y funcionan como gamepad en los 3 minijuegos.',
  },
  {
    id: 'h-bridge-motors',
    board: 'ideaboard',
    name: 'Doble Puente H (MOTOR 1 / MOTOR 2)',
    chipOrPin: 'Driver integrado · hasta 800 mA/canal',
    status: 'expansion',
    telemetryField: 'Libre en este demo',
    description:
      'Permite controlar directamente dos motores DC con PWM (velocidad y giro) desde CircuitPython usando ib.motor_1 / ib.motor_2.',
    cyberLabUsage:
      'No se usa en esta interfaz web, pero en el MakerLab permite accionar una cerradura física o ventilador ante alerta del SOC.',
  },
  {
    id: 'gpio-adc-vin',
    board: 'ideaboard',
    name: 'Bancos GPIO / ADC / Touch + Bornera Vin',
    chipOrPin: 'Pines laterales + alimentación externa',
    status: 'expansion',
    telemetryField: 'Libre en este demo',
    description:
      'Pines digitales, analógicos y capacitivos junto con bornera verde Vin para alimentar proyectos sin puerto USB.',
    cyberLabUsage:
      'Listos para añadir buzzer de alarma, relé de corte eléctrico, sensor magnético de puerta o batería portátil en campo.',
  },
];

export const MAKER_DICTIONARY_TERMS: MakerTermEntry[] = [
  {
    id: 'microcontroller',
    term: 'Microcontrolador (MCU · IdeaBoard ESP32-WROOM-32E)',
    category: 'hardware',
    categoryLabel: 'Microcontrolador y PCB',
    shortTag: 'Cómputo embebido',
    definition:
      'Un microcontrolador integra procesador (CPU), memoria RAM/Flash y periféricos (BLE, I2C, GPIO, PWM) en un solo chip para ejecutar tareas dedicadas en tiempo real sin sistema operativo de escritorio.',
    inThisProject:
      'La IdeaBoard ejecuta code.py en CircuitPython para leer sensores a 25 Hz y decidir alertas locales o transmitirlas por Bluetooth.',
  },
  {
    id: 'pcb',
    term: 'PCB (Placa de Circuito Impreso · IdeaSense Explorer)',
    category: 'hardware',
    categoryLabel: 'Microcontrolador y PCB',
    shortTag: 'Hardware físico',
    definition:
      'Placa física con pistas de cobre recubiertas (máscara antisoldante negra en IdeaSense) que interconecta chips SMD, resistencias pull-up, LEDs y conectores de forma compacta y repetible.',
    inThisProject:
      'La IdeaSense Explorer es una PCB de expansión que agrupa 4 chips de sensores/actuadores con montaje mecánico M3 y doble puerto Qwiic.',
  },
  {
    id: 'i2c-qwiic',
    term: 'Bus I2C y Conector Qwiic / STEMMA QT',
    category: 'protocols',
    categoryLabel: 'Buses y Protocolos',
    shortTag: '4 hilos · SDA/SCL',
    definition:
      'Bus serial de solo dos hilos de señal (SDA para datos y SCL para reloj) donde cada chip responde a una dirección hexadecimal única; Qwiic estandariza el cable de 4 pines a 3.3 V para evitar errores de polaridad.',
    inThisProject:
      'Comparte un mismo cable para cuatro direcciones reales de la IdeaSense: 0x29 (LTR-303), 0x44 (SHT30), 0x6A (LSM6DS3TR-C) y 0x70 (HT16K33).',
  },
  {
    id: 'ble-nus',
    term: 'Bluetooth LE y Nordic UART Service (NUS)',
    category: 'protocols',
    categoryLabel: 'Buses y Protocolos',
    shortTag: 'Inalámbrico 25 Hz',
    definition:
      'Perfil de comunicación inalámbrica de bajo consumo que emula un puerto serie bidireccional mediante características GATT (TX para notificar telemetría y RX para recibir comandos).',
    inThisProject:
      'Web Bluetooth permite que Chrome o Edge se conecten directo al ESP32 ("IdeaSense-CyberSec") sin drivers ni servidor intermedio.',
  },
  {
    id: 'circuitpython',
    term: 'CircuitPython y Librería ideasense.py',
    category: 'firmware',
    categoryLabel: 'Firmware e IDEs',
    shortTag: 'Python en MCU',
    definition:
      'Variante educativa de Python diseñada para microcontroladores. Abstrae registros de bajo nivel para leer hardware con propiedades simples como idea.temp, idea.light o idea.accel.',
    inThisProject:
      'Nuestro firmware code.py usa ideasense.py cuando está disponible y además incluye respaldo I2C directo para evitar bloqueos si falta algún chip.',
  },
  {
    id: 'ideacode',
    term: 'IdeaCode / IdeaScratch + Puente Serial CH340G',
    category: 'firmware',
    categoryLabel: 'Firmware e IDEs',
    shortTag: 'Flujo web serial',
    definition:
      'Debido a que el ESP32-WROOM-32E clásico usa convertidor serial USB-UART (CH340G) en lugar de memoria USB masiva, los scripts se suben vía Web Serial desde el navegador.',
    inThisProject:
      'Descargas code.py desde "Firmware y Guía" y lo ejecutas en la IdeaBoard mediante ideacode.crcibernetica.com con Ctrl+R.',
  },
  {
    id: 'keyscan-pullup',
    term: 'Keyscan Matricial (HT16K33) vs GPIO Pull-Up',
    category: 'hardware',
    categoryLabel: 'Microcontrolador y PCB',
    shortTag: 'Entradas físicas',
    definition:
      'Un botón Pull-Up mantiene nivel lógico alto en reposo y cae a 0 V al cerrarse; cuando hay varios botones y LEDs en una PCB compacta, un controlador como el HT16K33 escanea filas/columnas por I2C.',
    inThisProject:
      'En IdeaSense Explorer los botones A, B y C se leen por HT16K33 (0x70) vía idea.held; code.py agrupa A en "ba" y B/C en "bb".',
  },
  {
    id: 'edge-ai-knn',
    term: 'Edge AI y Clasificador k-NN (16 dimensiones)',
    category: 'cyber_ai',
    categoryLabel: 'Ciberseguridad e IA',
    shortTag: 'IA local en el borde',
    definition:
      'Ejecutar inferencia de Inteligencia Artificial cerca del sensor (sin enviar datos crudos constantes a la nube) calculando estadísticas de ventanas temporales y comparándolas por distancia euclidiana.',
    inThisProject:
      'El Laboratorio IA extrae media y desviación estándar de 8 canales (16 features) en ventanas de 30 paquetes y exporta Python listo para correr en el ESP32.',
  },
  {
    id: 'tampering-side-channel',
    term: 'Sabotaje Físico (MITRE T1200) y Canal Lateral',
    category: 'cyber_ai',
    categoryLabel: 'Ciberseguridad e IA',
    shortTag: 'Seguridad física IoT',
    definition:
      'Vectores donde el atacante accede al hardware real: abrir un gabinete (luz), mover o perforar el chasis (IMU), inducir estrés térmico (SHT30) o modular bits mediante luz/calor.',
    inThisProject:
      'Correlaciona reglas determinísticas de umbral con Z-Score estadístico y análisis forense asistido por Gemini sobre evidencia CSV.',
  },
];

export function filterHardwareComponents(
  items: HardwareComponentItem[],
  boardFilter: 'all' | HardwareBoardRole,
  usageFilter: 'all' | UsageStatus,
): HardwareComponentItem[] {
  return items.filter((item) => {
    if (boardFilter !== 'all' && item.board !== boardFilter) return false;
    if (usageFilter !== 'all' && item.status !== usageFilter) return false;
    return true;
  });
}

export function filterMakerTerms(
  terms: MakerTermEntry[],
  category: 'all' | DictionaryCategory,
  searchQuery: string,
): MakerTermEntry[] {
  const q = searchQuery.trim().toLowerCase();
  return terms.filter((entry) => {
    if (category !== 'all' && entry.category !== category) return false;
    if (!q) return true;
    const haystack = `${entry.term} ${entry.shortTag} ${entry.definition} ${entry.inThisProject}`.toLowerCase();
    return haystack.includes(q);
  });
}
