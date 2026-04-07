// Retro synthesizer for reference tones and sound effects
// Uses square/triangle waves for NES/Game Boy aesthetic

import { midiToFreq } from '../music/theory';

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Must be called synchronously from a user gesture (tap/click) on mobile
export async function unlockAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  // Play a silent buffer to fully unlock on iOS
  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
}

interface NoteOptions {
  midi: number;
  duration?: number; // seconds
  wave?: OscillatorType;
  volume?: number; // 0-1
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
}

// Play a single note with ADSR envelope
export function playNote(opts: NoteOptions): void {
  const ctx = getAudioContext();
  const {
    midi,
    duration = 1,
    wave = 'triangle',
    volume = 0.3,
    attack = 0.02,
    decay = 0.1,
    sustain = 0.6,
    release = 0.3,
  } = opts;

  const freq = midiToFreq(midi);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = wave;
  osc.frequency.setValueAtTime(freq, now);

  // ADSR envelope
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
  gain.gain.setValueAtTime(volume * sustain, now + duration - release);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

// Play a chord (multiple notes)
export function playChord(
  midis: number[],
  duration = 1.5,
  wave: OscillatorType = 'triangle',
  stagger = 0.02 // slight stagger for realism
): void {
  midis.forEach((midi, i) => {
    setTimeout(() => {
      playNote({ midi, duration, wave, volume: 0.25 / Math.sqrt(midis.length) });
    }, i * stagger * 1000);
  });
}

// Play a scale ascending then descending
export function playScale(
  rootMidi: number,
  intervals: number[],
  tempo = 200, // ms per note
  wave: OscillatorType = 'triangle'
): void {
  const ascending = intervals.map(i => rootMidi + i);
  const descending = [...ascending].reverse().slice(1);
  const allNotes = [...ascending, rootMidi + 12, ...descending];

  allNotes.forEach((midi, i) => {
    setTimeout(() => {
      playNote({ midi, duration: tempo / 1000 * 0.9, wave, volume: 0.3 });
    }, i * tempo);
  });
}

// Play an interval (two notes, either simultaneous or sequential)
export function playInterval(
  rootMidi: number,
  semitones: number,
  mode: 'harmonic' | 'melodic' = 'melodic',
  wave: OscillatorType = 'triangle'
): void {
  if (mode === 'harmonic') {
    playChord([rootMidi, rootMidi + semitones], 1.5, wave);
  } else {
    playNote({ midi: rootMidi, duration: 0.8, wave });
    setTimeout(() => {
      playNote({ midi: rootMidi + semitones, duration: 0.8, wave });
    }, 900);
  }
}

// Play a chord progression
export function playProgression(
  rootMidi: number,
  degrees: number[],
  qualities: ('major' | 'minor' | 'diminished' | 'dominant7')[],
  tempo = 800, // ms per chord
  wave: OscillatorType = 'triangle'
): void {
  const chordIntervals: Record<string, number[]> = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    dominant7: [0, 4, 7, 10],
  };

  degrees.forEach((degree, i) => {
    setTimeout(() => {
      const base = rootMidi + degree;
      const intervals = chordIntervals[qualities[i]];
      const midis = intervals.map(iv => base + iv);
      playChord(midis, tempo / 1000 * 0.9, wave);
    }, i * tempo);
  });
}

// 8-bit sound effects
export function playSfx(type: 'correct' | 'incorrect' | 'levelup' | 'click'): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  switch (type) {
    case 'correct': {
      // Ascending two-tone chime
      [0, 0.12].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime([880, 1320][i], now + delay);
        gain.gain.setValueAtTime(0.15, now + delay);
        gain.gain.linearRampToValueAtTime(0, now + delay + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.15);
      });
      break;
    }
    case 'incorrect': {
      // Descending buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
      break;
    }
    case 'levelup': {
      // Ascending arpeggio
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.12, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.25);
      });
      break;
    }
    case 'click': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }
  }
}

// Metronome tick
export function playMetronomeTick(accent = false): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(accent ? 1200 : 800, now);
  gain.gain.setValueAtTime(accent ? 0.2 : 0.12, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.04);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}
