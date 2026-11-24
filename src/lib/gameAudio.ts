let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playGameTone(
  freqHz: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gainLevel: number = 0.06,
  muted: boolean = false,
): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } catch {
    // Ignore audio errors in restricted headless environments
  }
}

export function playBlockSfx(muted: boolean): void {
  playGameTone(520, 0.08, 'triangle', 0.07, muted);
  setTimeout(() => playGameTone(760, 0.09, 'triangle', 0.05, muted), 45);
}

export function playSuccessSfx(muted: boolean): void {
  playGameTone(587, 0.08, 'sine', 0.06, muted);
  setTimeout(() => playGameTone(880, 0.14, 'sine', 0.07, muted), 70);
}

export function playErrorSfx(muted: boolean): void {
  playGameTone(185, 0.16, 'sawtooth', 0.06, muted);
}
