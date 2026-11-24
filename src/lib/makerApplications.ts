import type { CyberScenario, SecurityClassId } from './types';

export type MakerSensorDomain = 'light' | 'imu' | 'thermal' | 'mfa';

export interface MakerLabUseCase {
  id: MakerSensorDomain;
  sensorTitle: string;
  chipset: string;
  realWorldTitle: string;
  sectorContext: string;
  microcontrollerRole: string;
  edgeAiRole: string;
  makerLabProject: string;
  recommendedScenario: CyberScenario;
  mappedClass: SecurityClassId;
}

export const MAKERLAB_USE_CASES: Record<MakerSensorDomain, MakerLabUseCase> = {
  light: {
    id: 'light',
    sensorTitle: 'Sensor Óptico Digital (LTR-303 · 0x29)',
    chipset: 'LTR-303 I2C (0x29) · Fotodiodo visible + IR',
    realWorldTitle: 'Sello óptico de gabinetes y defensa contra fuga por LED (Air-Gap OOK)',
    sectorContext:
      'Centros de datos, cajeros automáticos, medidores inteligentes y gabinetes industriales donde abrir la carcasa o usar láseres de inyección compromete hardware crítico.',
    microcontrollerRole:
      'El ESP32-WROOM-32E muestrea idea.light a 25 Hz por I2C; si la luz rompe el rango seguro o detecta pulsos rápidos, dispara alarma local en la matriz LED 5×5 y enciende el NeoPixel IO02 en rojo.',
    edgeAiRole:
      'El modelo k-NN analiza la media (μLuz) y la desviación estándar (σLuz) para distinguir luz ambiental estable de ráfagas moduladas (exfiltración óptica OOK) o ceguera intencional del sensor.',
    makerLabProject:
      'Construir una caja fuerte o mini-rack con IdeaBoard que corte alimentación de un puerto simulado o dispare alarma BLE si alguien abre la tapa o apunta una linterna.',
    recommendedScenario: 'optical_breach',
    mappedClass: 'optical_breach',
  },
  imu: {
    id: 'imu',
    sensorTitle: 'Unidad Inercial 6-DoF (IMU LSM6DS3TR-C · 0x6A)',
    chipset: 'LSM6DS3TR-C I2C (0x6A) · Acelerómetro + Giroscopio MEMS',
    realWorldTitle: 'Centinela anti-sabotaje y detección de traslado/extracción física (MITRE T1200)',
    sectorContext:
      'Routers de borde, puntos de venta (POS), estaciones meteorológicas IoT y nodos OT desplegados fuera de oficinas vigiladas.',
    microcontrollerRole:
      'El microcontrolador ESP32 lee idea.accel (m/s² → g) e idea.gyro (rad/s → dps) para calcular Δ|a| y |ω| sin depender de la nube; ante vibración de taladro o giro de bisagra puede borrar claves temporales en RAM.',
    edgeAiRole:
      'Entrenando 12 dimensiones IMU en k-NN (medias y desviaciones de ax..gz), la placa aprende a ignorar vibración normal de ventiladores y alertar solo ante manipulación humana real.',
    makerLabProject:
      'Prototipar un candado inteligente para equipo de laboratorio que diferencie golpes accidentales de la apertura controlada de una puerta con bisagra.',
    recommendedScenario: 'tampering',
    mappedClass: 'tampering',
  },
  thermal: {
    id: 'thermal',
    sensorTitle: 'Sensor Térmico y Humedad (SHT30 · 0x44)',
    chipset: 'SHT30 I2C (0x44) · Bandgap térmico + polímero capacitivo',
    realWorldTitle: 'Detección de sobrecarga oculta, cryptojacking y sabotaje HVAC en cuartos técnicos',
    sectorContext:
      'Armarios de telecomunicaciones (IDF/MDF), granjas de cómputo embebido y dispositivos IoT expuestos a ataques de canal lateral térmico o degradación ambiental.',
    microcontrollerRole:
      'El ESP32 correlaciona temperatura de PCB y punto de rocío para activar un ventilador en el Puente H de la IdeaBoard, emitir alerta al SOC y registrar evidencia forense si la temperatura sube sin carga legítima.',
    edgeAiRole:
      'El clasificador combina la deriva térmica (μTmp, σTmp) con la firma inercial para identificar ciclos sostenidos anómalos (fuerza bruta interna o fuente externa de calor).',
    makerLabProject:
      'Diseñar un monitor ambiental autónomo para racks MakerLab que reporte deriva térmica por BLE y muestre alertas visuales de riesgo de condensación en la matriz 5×5.',
    recommendedScenario: 'thermal_attack',
    mappedClass: 'side_channel',
  },
  mfa: {
    id: 'mfa',
    sensorTitle: 'Botones A/B/C y Matriz 5×5 (HT16K33 · 0x70)',
    chipset: 'HT16K33 I2C (0x70) · Keyscan A, B/C + Matriz LED 5×5',
    realWorldTitle: 'Segundo factor físico (MFA tipo FIDO2) y bloqueo ante fuerza bruta en hardware',
    sectorContext:
      'Consolas de administración crítica, llaves criptográficas USB/BLE, controladores PLC y nodos que exigen presencia humana verificable para autorizar comandos sensibles.',
    microcontrollerRole:
      'El ESP32 lee A (ba) y B/C (bb) mediante idea.held sobre el HT16K33 para aprobar sesiones privilegiadas y aplica rate-limiting en ventana deslizante de 3 s si detecta ráfagas de fuerza bruta.',
    edgeAiRole:
      'Integrado con telemetría BLE y el analizador Gemini, permite auditar intentos repetidos de acceso local y correlacionarlos con eventos físicos del mismo instante.',
    makerLabProject:
      'Implementar un token de confirmación física en CircuitPython: un script en PC solicita firma BLE y el comando solo se ejecuta cuando el usuario confirma con Botón A + B/C en la IdeaSense.',
    recommendedScenario: 'brute_force',
    mappedClass: 'side_channel',
  },
};

export function getMakerUseCaseForScenario(scenario: CyberScenario): MakerLabUseCase {
  switch (scenario) {
    case 'optical_breach':
      return MAKERLAB_USE_CASES.light;
    case 'tampering':
      return MAKERLAB_USE_CASES.imu;
    case 'thermal_attack':
      return MAKERLAB_USE_CASES.thermal;
    case 'brute_force':
      return MAKERLAB_USE_CASES.mfa;
    case 'normal':
    default:
      return MAKERLAB_USE_CASES.imu;
  }
}

export function getMakerUseCaseForClass(classId: SecurityClassId): MakerLabUseCase {
  switch (classId) {
    case 'optical_breach':
      return MAKERLAB_USE_CASES.light;
    case 'tampering':
      return MAKERLAB_USE_CASES.imu;
    case 'side_channel':
      return MAKERLAB_USE_CASES.thermal;
    case 'normal':
    default:
      return MAKERLAB_USE_CASES.mfa;
  }
}
