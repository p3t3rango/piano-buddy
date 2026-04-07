// Two-layer pitch detection:
// 1. Pitchy — real-time single-note detection (fast, accurate)
// 2. Spotify Basic Pitch — ML polyphonic chord detection (buffered)

import { PitchDetector as PitchyDetector } from 'pitchy';
import { freqToNearestMidi, midiToPitchClass, freqToCentsOff } from '../music/theory';

export interface PitchResult {
  frequency: number;
  midi: number;
  confidence: number;
}

export interface ChromaResult {
  chroma: number[];
  activePitchClasses: number[];
  activeMidis: number[]; // ML-detected MIDI notes
  dominantPitchClass: number;
  rms: number;
}

// Downsample audio from source rate to target rate
function downsample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.floor(i * ratio)];
  }
  return result;
}

export class PitchDetector {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private timeBuf: Float32Array<ArrayBuffer> | null = null;
  private running = false;

  // Pitchy detector for single notes
  private pitchyDetector: ReturnType<typeof PitchyDetector.forFloat32Array> | null = null;

  // Basic Pitch ML model for chords
  private basicPitchModel: import('@spotify/basic-pitch').BasicPitch | null = null;
  private modelLoading = false;
  private modelReady = false;

  // Audio buffer for ML chord detection
  private audioRingBuffer: Float32Array | null = null;
  private ringBufferWritePos = 0;
  private readonly RING_BUFFER_SECONDS = 1.5;

  // Script processor for capturing raw audio
  private scriptNode: ScriptProcessorNode | null = null;

  // Latest ML chord results
  private _mlMidis: number[] = [];
  private _mlChroma: number[] = new Array(12).fill(0);
  private _mlLastUpdate = 0;
  private _mlProcessing = false;

  private static readonly FFT_SIZE = 4096;

  private init(): void {
    if (this.audioCtx) return;
    this.audioCtx = new AudioContext();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = PitchDetector.FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.8;
    this.timeBuf = new Float32Array(PitchDetector.FFT_SIZE);
    this.pitchyDetector = PitchyDetector.forFloat32Array(PitchDetector.FFT_SIZE);

    // Ring buffer for ML model (stores last N seconds at mic sample rate)
    const bufLen = Math.ceil(this.audioCtx.sampleRate * this.RING_BUFFER_SECONDS);
    this.audioRingBuffer = new Float32Array(bufLen);
    this.ringBufferWritePos = 0;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.init();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      this.source = this.audioCtx!.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser!);

      // Script processor to capture raw audio into ring buffer
      this.scriptNode = this.audioCtx!.createScriptProcessor(4096, 1, 1);
      this.scriptNode.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const ring = this.audioRingBuffer!;
        for (let i = 0; i < input.length; i++) {
          ring[this.ringBufferWritePos] = input[i];
          this.ringBufferWritePos = (this.ringBufferWritePos + 1) % ring.length;
        }
      };
      this.source.connect(this.scriptNode);
      this.scriptNode.connect(this.audioCtx!.destination); // Required for scriptProcessor to work

      if (this.audioCtx!.state === 'suspended') {
        await this.audioCtx!.resume();
      }
      this.running = true;

      // Load ML model in background
      this.loadModel();
    } catch (err) {
      console.error('Microphone error:', err);
      throw err;
    }
  }

  private async loadModel(): Promise<void> {
    if (this.modelLoading || this.modelReady) return;
    this.modelLoading = true;
    try {
      const { BasicPitch } = await import('@spotify/basic-pitch');
      this.basicPitchModel = new BasicPitch('/model/model.json');
      this.modelReady = true;
      console.log('Basic Pitch ML model loaded');
    } catch (err) {
      console.warn('Could not load Basic Pitch model, using fallback:', err);
    }
    this.modelLoading = false;
  }

  stop(): void {
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  getRMS(): number {
    if (!this.analyser || !this.timeBuf) return 0;
    this.analyser.getFloatTimeDomainData(this.timeBuf);
    let sum = 0;
    for (let i = 0; i < this.timeBuf.length; i++) {
      sum += this.timeBuf[i] * this.timeBuf[i];
    }
    return Math.sqrt(sum / this.timeBuf.length);
  }

  // ── Single-note detection via Pitchy ──
  detectPitch(): PitchResult | null {
    if (!this.running || !this.analyser || !this.timeBuf || !this.pitchyDetector || !this.audioCtx) {
      return null;
    }

    this.analyser.getFloatTimeDomainData(this.timeBuf);

    // Check signal level
    let sum = 0;
    for (let i = 0; i < this.timeBuf.length; i++) {
      sum += this.timeBuf[i] * this.timeBuf[i];
    }
    const rms = Math.sqrt(sum / this.timeBuf.length);
    if (rms < 0.008) return null;

    const [pitch, clarity] = this.pitchyDetector.findPitch(
      this.timeBuf,
      this.audioCtx.sampleRate
    );

    // Pitchy clarity threshold — higher = more confident
    if (clarity < 0.85 || pitch < 60 || pitch > 2100) return null;

    const midi = freqToNearestMidi(pitch);

    return {
      frequency: pitch,
      midi,
      confidence: clarity,
    };
  }

  // ── Chord detection via ML (Spotify Basic Pitch) ──
  // Called periodically (not every frame) — returns cached results between updates
  getChroma(): ChromaResult {
    const rms = this.getRMS();
    const now = Date.now();

    // Trigger ML inference every ~800ms if model is ready and not already processing
    if (
      this.modelReady &&
      !this._mlProcessing &&
      now - this._mlLastUpdate > 800 &&
      rms > 0.005
    ) {
      this.runMLChordDetection();
    }

    return {
      chroma: this._mlChroma,
      activePitchClasses: this._mlMidis.map(m => midiToPitchClass(m)),
      activeMidis: this._mlMidis,
      dominantPitchClass: this._mlMidis.length > 0 ? midiToPitchClass(this._mlMidis[0]) : 0,
      rms,
    };
  }

  private async runMLChordDetection(): Promise<void> {
    if (!this.basicPitchModel || !this.audioRingBuffer || !this.audioCtx) return;
    this._mlProcessing = true;

    try {
      // Extract audio from ring buffer (linearized)
      const ring = this.audioRingBuffer;
      const len = ring.length;
      const linear = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        linear[i] = ring[(this.ringBufferWritePos + i) % len];
      }

      // Downsample to 22050Hz (Basic Pitch requirement)
      const resampled = downsample(linear, this.audioCtx.sampleRate, 22050);

      // Run model
      const allFrames: number[][] = [];
      const allOnsets: number[][] = [];

      await this.basicPitchModel.evaluateModel(
        resampled,
        (frames, onsets) => {
          allFrames.push(...frames);
          allOnsets.push(...onsets);
        },
        () => {} // progress callback
      );

      if (allFrames.length === 0) {
        this._mlMidis = [];
        this._mlChroma = new Array(12).fill(0);
        this._mlLastUpdate = Date.now();
        this._mlProcessing = false;
        return;
      }

      // Use the last few frames (most recent audio) to find currently-playing notes
      const { outputToNotesPoly } = await import('@spotify/basic-pitch');
      const recentFrames = allFrames.slice(-30); // Last ~0.35s
      const recentOnsets = allOnsets.slice(-30);
      const notes = outputToNotesPoly(
        recentFrames,
        recentOnsets,
        0.4,  // onset threshold
        0.25, // frame threshold
        2,    // min note length (shorter for real-time)
        true, // infer onsets
        null, // max freq
        null, // min freq
        false // no melodia trick for real-time
      );

      // Extract unique MIDI notes, sorted by amplitude
      const midiMap = new Map<number, number>();
      for (const note of notes) {
        const existing = midiMap.get(note.pitchMidi) ?? 0;
        midiMap.set(note.pitchMidi, Math.max(existing, note.amplitude));
      }

      // Also check raw frame activations for currently-sounding notes
      if (allFrames.length > 0) {
        const lastFrame = allFrames[allFrames.length - 1];
        for (let i = 0; i < lastFrame.length; i++) {
          if (lastFrame[i] > 0.3) {
            const midi = i + 21; // MIDI offset
            const existing = midiMap.get(midi) ?? 0;
            midiMap.set(midi, Math.max(existing, lastFrame[i]));
          }
        }
      }

      const sortedMidis = Array.from(midiMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([midi]) => midi)
        .slice(0, 6); // Max 6 notes

      this._mlMidis = sortedMidis;

      // Build chromagram from detected notes
      const chroma = new Array(12).fill(0);
      for (const [midi, amp] of midiMap.entries()) {
        chroma[midiToPitchClass(midi)] += amp;
      }
      const maxC = Math.max(...chroma);
      if (maxC > 0) {
        for (let i = 0; i < 12; i++) chroma[i] /= maxC;
      }
      this._mlChroma = chroma;

    } catch (err) {
      console.warn('ML chord detection error:', err);
    }

    this._mlLastUpdate = Date.now();
    this._mlProcessing = false;
  }
}
