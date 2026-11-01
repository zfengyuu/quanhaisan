/**
 * Audio manager for Quán Hải Sản:
 * - Sound FX (cues from WAV files)
 * - Procedural ambient ocean waves synthesizer (Web Audio API)
 * - Customer bell & food serving audio jingles
 */

export type SoundCue = 'coin' | 'catch' | 'splash' | 'upgrade' | 'click' | 'chime';

let audioCtx: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let ambientNoiseSource: AudioBufferSourceNode | null = null;
let ambientLfo: OscillatorNode | null = null;
let isAmbientPlaying = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('qhs-sound-off') === '1';
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  if (muted) {
    window.localStorage.setItem('qhs-sound-off', '1');
    stopAmbientSound();
  } else {
    window.localStorage.removeItem('qhs-sound-off');
    if (isAmbientEnabled()) {
      startAmbientSound();
    }
  }
}

export function toggleSound(): boolean {
  const next = !isSoundMuted();
  setSoundMuted(next);
  return !next;
}

export function isAmbientEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('qhs-ambient-off') !== '1';
}

export function setAmbientEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.removeItem('qhs-ambient-off');
    if (!isSoundMuted()) startAmbientSound();
  } else {
    window.localStorage.setItem('qhs-ambient-off', '1');
    stopAmbientSound();
  }
}

export function toggleAmbient(): boolean {
  const next = !isAmbientEnabled();
  setAmbientEnabled(next);
  return next;
}

/** Plays a one-shot sound cue */
export function playSound(sound: SoundCue, volume = 0.28): void {
  if (typeof window === 'undefined') return;
  try {
    if (isSoundMuted()) return;
    const a = new Audio(`/assets/audio/${sound}.wav`);
    a.volume = volume;
    void a.play().catch(() => {});
  } catch {}
}

/** Pleasant chime when customer arrives at the restaurant */
export function playCustomerBell(): void {
  if (typeof window === 'undefined' || isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      playSound('chime', 0.2);
      return;
    }
    // High soft two-tone bell (ding-dong: 659Hz -> 880Hz)
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch {
    playSound('chime', 0.2);
  }
}

/** Serving sound when waitress Mai places the dish on the table */
export function playServeSound(): void {
  if (typeof window === 'undefined' || isSoundMuted()) return;
  // Satisfying chime followed by coin sound
  playSound('chime', 0.25);
  setTimeout(() => {
    playSound('coin', 0.22);
  }, 180);
}

/** Starts procedural coastal wave ambiance using Web Audio API */
export function startAmbientSound(): void {
  if (typeof window === 'undefined') return;
  if (isSoundMuted() || !isAmbientEnabled() || isAmbientPlaying) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 4-second pink-like noise buffer representing sea surf
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter to soft underwater/harbor sea rumble
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);

    // LFO for periodic wave crests (every ~9 seconds)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.11, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.035, ctx.currentTime);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.03, ctx.currentTime);

    lfo.connect(waveGain.gain);
    noise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(ctx.destination);

    lfo.start();
    noise.start();

    ambientNoiseSource = noise;
    ambientLfo = lfo;
    ambientGain = waveGain;
    isAmbientPlaying = true;
  } catch {}
}

export function stopAmbientSound(): void {
  if (!isAmbientPlaying) return;
  try {
    ambientLfo?.stop();
    ambientNoiseSource?.stop();
    ambientLfo?.disconnect();
    ambientNoiseSource?.disconnect();
    ambientGain?.disconnect();
  } catch {}
  ambientNoiseSource = null;
  ambientLfo = null;
  ambientGain = null;
  isAmbientPlaying = false;
}
