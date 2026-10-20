import type { SirenKind } from "../game/vehicles";

/**
 * Every sound is synthesised with Web Audio: no files to download, works offline, and
 * the volume stays soft for small ears. The context starts on the first tap (browsers
 * keep audio locked until then).
 *
 * Sound, speech and vibration are extras: they run inside `safely`, so a browser that
 * lacks one (Safari has no `navigator.vibrate`) never stops the game loop.
 */
let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let muted = safely(
  () => localStorage.getItem("zachranari.muted") === "1",
  false,
);

/** Runs a feedback effect; any error is logged and swallowed. */
function safely<T>(effect: () => T, otherwise: T): T {
  try {
    return effect();
  } catch (error) {
    console.warn("Feedback effect failed", error);
    return otherwise;
  }
}

const VOLUME = 0.32;

export function unlockAudio(): void {
  safely(() => {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  }, undefined);
}

export const isMuted = (): boolean => muted;

export function setMuted(value: boolean): void {
  muted = value;
  safely(() => {
    localStorage.setItem("zachranari.muted", value ? "1" : "0");
    if (master && ctx)
      master.gain.setTargetAtTime(value ? 0 : VOLUME, ctx.currentTime, 0.02);
  }, undefined);
}

interface Note {
  freq: number;
  /** Seconds from now. */
  at: number;
  length: number;
  type?: OscillatorType;
  volume?: number;
  /** Glide to this frequency over the note. */
  to?: number;
}

function play(notes: readonly Note[]): void {
  safely(() => schedule(notes), undefined);
}

function schedule(notes: readonly Note[]): void {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "triangle";
    const start = now + n.at;
    const end = start + n.length;
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, end);
    const peak = n.volume ?? 0.5;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    gain.gain.setValueAtTime(peak, Math.max(start + 0.015, end - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

/** A siren for about two seconds, each service with its own tune. */
export function siren(kind: SirenKind): void {
  if (!ctx || !master) return;
  const notes: Note[] = [];
  const voice = { type: "square" as const, volume: 0.13 };
  if (kind === "hilo") {
    // The European two-tone "tatü-tata".
    for (let i = 0; i < 4; i++) {
      notes.push({ freq: 466, at: i * 0.5, length: 0.25, ...voice });
      notes.push({ freq: 622, at: i * 0.5 + 0.25, length: 0.25, ...voice });
    }
  } else if (kind === "wail") {
    notes.push({ freq: 520, to: 1250, at: 0, length: 0.9, ...voice });
    notes.push({ freq: 1250, to: 520, at: 0.9, length: 0.9, ...voice });
  } else {
    for (let i = 0; i < 6; i++)
      notes.push({ freq: 600, to: 1100, at: i * 0.3, length: 0.28, ...voice });
    notes.push({
      freq: 220,
      at: 0,
      length: 0.35,
      type: "sawtooth",
      volume: 0.1,
    });
  }
  play(notes);
}

export const sfx = {
  tap: () => play([{ freq: 660, at: 0, length: 0.08, volume: 0.3 }]),
  jump: () => play([{ freq: 300, to: 720, at: 0, length: 0.22, volume: 0.35 }]),
  land: () =>
    play([
      { freq: 140, to: 90, at: 0, length: 0.12, type: "sine", volume: 0.5 },
    ]),
  treat: (combo: number) => {
    const base = 660 * Math.pow(2, Math.min(combo, 7) / 12);
    play([
      { freq: base, at: 0, length: 0.09, volume: 0.35 },
      { freq: base * 1.5, at: 0.07, length: 0.14, volume: 0.35 },
    ]);
  },
  fuel: () =>
    play([
      { freq: 392, at: 0, length: 0.1 },
      { freq: 523, at: 0.09, length: 0.1 },
      { freq: 659, at: 0.18, length: 0.1 },
      { freq: 784, at: 0.27, length: 0.22 },
    ]),
  lowFuel: () =>
    play([
      { freq: 440, at: 0, length: 0.14, type: "sine" },
      { freq: 330, at: 0.18, length: 0.2, type: "sine" },
    ]),
  milestone: () =>
    play(
      [523, 659, 784, 1047, 784, 1047].map((freq, i) => ({
        freq,
        at: i * 0.11,
        length: i === 5 ? 0.4 : 0.12,
        volume: 0.4,
      })),
    ),
  finish: () =>
    play(
      [392, 523, 659, 784, 659, 784, 1047].map((freq, i) => ({
        freq,
        at: i * 0.14,
        length: i === 6 ? 0.6 : 0.14,
        volume: 0.4,
      })),
    ),
};

/** Says a short Czech phrase when the device has a Czech voice; silent otherwise. */
export function say(text: string): void {
  safely(() => speak(text), undefined);
}

function speak(text: string): void {
  if (muted || typeof window.speechSynthesis?.getVoices !== "function") return;
  const voice = speechSynthesis
    .getVoices()
    .find((v) => v.lang.toLowerCase().startsWith("cs"));
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.95;
  u.pitch = 1.15;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/** A short buzz on phones that can (Android); ignored elsewhere. */
export function buzz(ms: number): void {
  // Safari has the name but no function: check the type, not the key.
  safely(() => {
    if (typeof navigator.vibrate === "function") navigator.vibrate(ms);
  }, undefined);
}
