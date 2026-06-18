// Tiny WebAudio blips/chimes — created lazily after a user gesture.
let actx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean): void {
  muted = m;
}
export function isMuted(): boolean {
  return muted;
}

function ctx(): AudioContext | null {
  if (!actx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      actx = new Ctor();
    } catch {
      actx = null;
    }
  }
  return actx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number): void {
  if (muted) return;
  const a = ctx();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = 0;
  o.connect(g);
  g.connect(a.destination);
  const t = a.currentTime;
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur);
}

export function blip(f = 600): void {
  tone(f, 0.06, 'square', 0.03);
}
export function chime(): void {
  tone(523, 0.09, 'triangle', 0.05);
  window.setTimeout(() => tone(784, 0.12, 'triangle', 0.05), 90);
}
export function chirp(): void {
  // a soft two-note bird chirp on takeoff (quiet so it never becomes noise)
  tone(1850, 0.05, 'sine', 0.02);
  window.setTimeout(() => tone(2350, 0.04, 'sine', 0.015), 55);
}
export function resumeAudio(): void {
  void ctx()?.resume?.();
}
