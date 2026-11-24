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
    sensorTitle: 'Sensor Óptico (LTR-303 / LDR)',
    chipset: 'LTR-303 I2C · Fotodiodo digital',
    realWorldTitle: 'Sello óptico de gabinetes y defensa contra fuga por LED (Air-Gap OOK)',
    sectorContext:
      'Centros de datos, cajeros automáticos, medidores inteligentes y gabinetes industriales donde abrir la carcasa o usar láseres de inyección compromete hardware crítico.',
    microcontrollerRole:
      'El ESP32 muestrea el fotodiodo a 25 Hz por I2C; si la luz rompe el rango seguro o detecta pulsos rápidos, dispara alarma local en la matriz LED y bloquea puertos antes de que se conecte un programador JTAG/USB.',
    edgeAiRole:
      'El modelo k-NN analiza la media (μLuz) y la desviación estándar (σLuz) para distinguir luz ambiental estable de ráfagas moduladas (exfiltración óptica OOK) o ceguera intencional del sensor.',
    makerLabProject:
      'Construir una caja fuerte o mini-rack con IdeaBoard que corte alimentación de un puerto simulado o dispare alarma BLE si alguien abre la tapa o apunta una linterna.',
    recommendedScenario: 'optical_breach',
    mappedClass: 'optical_breach',
  },
  imu: {
    id: 'imu',
    sensorTitle: 'Unidad Inercial 6-DoF (IMU LSM6DS)',
    chipset: 'LSM6DS I2C · Acelerómetro + Giroscopio MEMS',
    realWorldTitle: 'Centinela anti-sabotaje y detección de traslado/extracción física (MITRE T1200)',
    sectorContext:
      'Routers de borde, puntos de venta (POS), estaciones meteorológicas IoT y nodos OT desplegados fuera de oficinas vigiladas.',
    microcontrollerRole:
      'El microcontrolador ESP32 calcula en tiempo real Δ|a| e inclinación angular |ω| sin depender de la nube; ante vibración de taladro o giro de bisagra puede borrar claves temporales en RAM (zeroization).',
    edgeAiRole:
      'Entrenando 12 dimensiones IMU en k-NN (medias y desviaciones de ax..gz), la placa aprende a ignorar vibración normal de ventiladores y alertar solo ante manipulación humana real.',
    makerLabProject:
      'Prototipar un candado inteligente para equipo de laboratorio que diferencie golpes accidentales de la apertura controlada de una puerta con bisagra.',
    recommendedScenario: 'tampering',
    mappedClass: 'tampering',
  },
  thermal: {
    id: 'thermal',
    sensorTitle: 'Sensor Térmico y Humedad (SHT30)',
    chipset: 'SHT30 I2C · Bandgap térmico + polímero capacitivo',
    realWorldTitle: 'Detección de sobrecarga oculta, cryptojacking y sabotaje HVAC en cuartos técnicos',
    sectorContext:
      'Armarios de telecomunicaciones (IDF/MDF), granjas de cómputo embebido y dispositivos IoT expuestos a ataques de canal lateral térmico o degradación ambiental.',
    microcontrollerRole:
      'El ESP32 correlaciona temperatura de PCB y punto de rocío para activar ventilación auxiliar, emitir alerta temprana al SOC y registrar evidencia forense si la temperatura sube sin carga legítima.',
    edgeAiRole:
      'El clasificador combina la deriva térmica (μTmp, σTmp) con la firma eléctrica/inercial para identificar ciclos sostenidos anómalos (fuerza bruta interna o fuente externa de calor).',
    makerLabProject:
      'Diseñar un monitor ambiental autónomo para racks MakerLab que reporte deriva térmica por BLE y muestre alertas visuales de riesgo de condensación en la matriz 5×5.',
    recommendedScenario: 'thermal_attack',
    mappedClass: 'side_channel',
  },
  mfa: {
    id: 'mfa',
    sensorTitle: 'Botones Físicos GPIO y Matriz 5×5',
    chipset: 'GPIO Pull-Up (A, B/C) + HT16K33 Matriz LED',
    realWorldTitle: 'Segundo factor físico (MFA tipo FIDO2) y bloqueo ante fuerza bruta en hardware',
    sectorContext:
      'Consolas de administración crítica, llaves criptográficas USB/BLE, controladores PLC y nodos que exigen presencia humana verificable para autorizar comandos sensibles.',
    microcontrollerRole:
      'El ESP32 exige pulsación física en los botones A/B/C para aprobar sesiones privilegiadas y aplica rate-limiting en ventana deslizante de 3 s si detecta ráfagas automatizadas o físicas.',
    edgeAiRole:
      'Integrado con telemetría BLE y el analizador Gemini, permite auditar intentos repetidos de acceso local y correlacionarlos con eventos físicos del mismo instante.',
    makerLabProject:
      'Implementar un token de confirmación física en CircuitPython: un script en PC solicita firma BLE y el comando solo se ejecuta cuando el usuario confirma con el Botón A+B en la IdeaBoard.',
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
