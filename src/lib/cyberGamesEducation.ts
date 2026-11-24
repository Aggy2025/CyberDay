export type FirewallPacketKind =
  | 'DDoS'
  | 'Phish'
  | 'Malware'
  | 'Brute'
  | 'Scan'
  | 'TLS'
  | 'SSH'
  | 'HTTPS';

export interface PacketCyberLesson {
  code: FirewallPacketKind;
  isThreat: boolean;
  fullName: string;
  ciaImpact: 'Disponibilidad' | 'Confidencialidad' | 'Integridad' | 'Tráfico Seguro';
  summary: string;
  defenseTip: string;
}

export const FIREWALL_LESSONS: Record<FirewallPacketKind, PacketCyberLesson> = {
  DDoS: {
    code: 'DDoS',
    isThreat: true,
    fullName: 'Inundación DDoS (Denegación de Servicio)',
    ciaImpact: 'Disponibilidad',
    summary: 'Miles de peticiones falsas saturan el puerto de red o la cola BLE del microcontrolador.',
    defenseTip: 'Un IPS aplica rate-limiting y descarta paquetes anómalos antes de agotar la CPU.',
  },
  Phish: {
    code: 'Phish',
    isThreat: true,
    fullName: 'Suplantación / Phishing de Credenciales',
    ciaImpact: 'Confidencialidad',
    summary: 'Intenta engañar al operador o servicio para capturar tokens de sesión o claves.',
    defenseTip: 'Verifica identidad criptográfica mutua y nunca aceptes comandos sin firma.',
  },
  Malware: {
    code: 'Malware',
    isThreat: true,
    fullName: 'Inyección de Carga Maliciosa (Payload)',
    ciaImpact: 'Integridad',
    summary: 'Busca alterar el firmware o sobrescribir registros críticos de sensores.',
    defenseTip: 'Inspección profunda de paquetes (DPI) y validación estricta de esquema JSON.',
  },
  Brute: {
    code: 'Brute',
    isThreat: true,
    fullName: 'Fuerza Bruta sobre PIN / Llave',
    ciaImpact: 'Confidencialidad',
    summary: 'Prueba combinaciones repetidas a alta velocidad hasta adivinar el acceso.',
    defenseTip: 'Bloqueo exponencial tras N intentos fallidos y rotación periódica de llaves.',
  },
  Scan: {
    code: 'Scan',
    isThreat: true,
    fullName: 'Reconocimiento / Escaneo de Puertos',
    ciaImpact: 'Confidencialidad',
    summary: 'Sondea servicios expuestos (UART, GATT, HTTP) buscando versiones vulnerables.',
    defenseTip: 'Principio de menor privilegio: deshabilita servicios innecesarios y oculta banners.',
  },
  TLS: {
    code: 'TLS',
    isThreat: false,
    fullName: 'Sesión Cifrada TLS 1.3',
    ciaImpact: 'Tráfico Seguro',
    summary: 'Tráfico legítimo autenticado que protege confidencialidad e integridad en tránsito.',
    defenseTip: 'Bloquear TLS genera un falso positivo y rompe la disponibilidad de usuarios reales.',
  },
  SSH: {
    code: 'SSH',
    isThreat: false,
    fullName: 'Administración Segura SSH',
    ciaImpact: 'Tráfico Seguro',
    summary: 'Canal cifrado autorizado para mantenimiento remoto con llave pública.',
    defenseTip: 'Un buen firewall permite tráfico administrativo autenticado sin interrumpirlo.',
  },
  HTTPS: {
    code: 'HTTPS',
    isThreat: false,
    fullName: 'Telemetría HTTPS Verificada',
    ciaImpact: 'Tráfico Seguro',
    summary: 'Envío cifrado de datos de sensores válidos hacia el servidor SOC.',
    defenseTip: 'Evita falsos positivos: distingue ataques reales de tráfico legítimo cifrado.',
  },
};

export interface FirewallOutcomeInput {
  blockedThreats: number;
  missedThreats: number;
  allowedSafe: number;
  falsePositives: number;
}

export function computeFirewallAccuracy(stats: FirewallOutcomeInput): number {
  const totalDecisions =
    stats.blockedThreats + stats.missedThreats + stats.allowedSafe + stats.falsePositives;
  if (totalDecisions <= 0) return 100;
  const correct = stats.blockedThreats + stats.allowedSafe;
  return Math.round((correct / totalDecisions) * 100);
}

export function computeSecurityGrade(accuracyPct: number, score: number): 'S' | 'A' | 'B' | 'C' {
  if (accuracyPct >= 90 && score >= 120) return 'S';
  if (accuracyPct >= 75 && score >= 60) return 'A';
  if (accuracyPct >= 55) return 'B';
  return 'C';
}

export interface OpticalTokenLesson {
  token: string;
  meaning: string;
  riskNote: string;
}

export const OPTICAL_TOKEN_LESSONS: Record<string, OpticalTokenLesson> = {
  TLS: {
    token: 'TLS',
    meaning: 'Llave de sesión TLS filtrada',
    riskNote: 'Un LED de estado mal aislado puede filtrar bits de handshake mediante modulación OOK.',
  },
  AES: {
    token: 'AES',
    meaning: 'Subclave de cifrado AES-128',
    riskNote: 'Canales laterales ópticos permiten reconstruir secretos bit a bit desde un fotodiodo.',
  },
  KEY: {
    token: 'KEY',
    meaning: 'Clave privada de dispositivo',
    riskNote: 'Incluso sin conexión Wi-Fi/USB (air-gap), pulsos luminosos rápidos exfiltran datos.',
  },
  SSH: {
    token: 'SSH',
    meaning: 'Token de acceso administrativo',
    riskNote: 'Limitar el parpadeo de LEDs de diagnóstico y vigilar picos LTR-303 mitiga la fuga.',
  },
  OTP: {
    token: 'OTP',
    meaning: 'Código temporal de un solo uso',
    riskNote: 'El sensor LTR-303 detecta si una linterna o láser externo intenta inyectar señales.',
  },
};

export function computeSignalQualityPct(hits: number, missesAndNoise: number): number {
  const total = hits + missesAndNoise;
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((hits / total) * 100)));
}

export interface MfaNodeLesson {
  idx: 0 | 1 | 2;
  title: string;
  inputHint: string;
  protocol: string;
  concept: string;
  mitigation: string;
}

export const MFA_NODE_LESSONS: MfaNodeLesson[] = [
  {
    idx: 0,
    title: 'Nodo 1 · Gateway BLE',
    inputHint: 'Tecla 1 / Botón A',
    protocol: 'Bluetooth Low Energy NUS',
    concept: 'Un atacante intenta adivinar el emparejamiento BLE enviando ráfagas rápidas.',
    mitigation: 'Rotar la clave de sesión y exigir confirmación física (Botón A) bloquea el secuestro.',
  },
  {
    idx: 1,
    title: 'Nodo 2 · Vault I2C',
    inputHint: 'Tecla 2 / Botón B',
    protocol: 'Bus Qwiic / Memoria Segura',
    concept: 'Sondeo no autorizado sobre registros de sensores y almacenamiento de llaves.',
    mitigation: 'Validación de presencia física en sitio y bloqueo automático tras intentos anómalos.',
  },
  {
    idx: 2,
    title: 'Nodo 3 · Root Token',
    inputHint: 'Tecla 3 / Botón A+B',
    protocol: 'Autenticación Doble Factor Hardware',
    concept: 'Ataque de fuerza bruta dirigido a la cuenta administrativa de mayor privilegio.',
    mitigation: 'Requerir pulsación simultánea (A+B) simula un token FIDO2 de doble verificación física.',
  },
];

export function computeMfaDefenseScore(streak: number): number {
  return 20 + Math.min(40, streak * 4);
}
