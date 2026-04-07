'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import PianoKeyboard from '@/components/PianoKeyboard';
import { PitchDetector, type PitchResult, type ChromaResult } from '@/lib/audio/pitchDetection';
import { detectChordFromChroma, formatChord, formatChordFull, type DetectedChord } from '@/lib/music/chords';
import { getIntervalName } from '@/lib/music/intervals';
import { unlockAudio } from '@/lib/audio/synth';
import { midiToNoteName, midiToPitchClass, pitchClassName, freqToCentsOff, NOTE_NAMES, semitoneDistance } from '@/lib/music/theory';

export default function ListenPage() {
  const [isListening, setIsListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
  const [currentChroma, setCurrentChroma] = useState<ChromaResult | null>(null);
  const [detectedChord, setDetectedChord] = useState<DetectedChord | null>(null);
  const [noteHistory, setNoteHistory] = useState<number[]>([]); // Last few MIDI notes for interval detection
  const [volume, setVolume] = useState(0);
  const detectorRef = useRef<PitchDetector | null>(null);
  const rafRef = useRef<number>(0);
  const lastMidiRef = useRef<number>(-1);
  const lastMidiTimeRef = useRef<number>(0);

  const analyze = useCallback(() => {
    if (!detectorRef.current?.isRunning()) return;

    const detector = detectorRef.current;
    const rms = detector.getRMS();
    setVolume(Math.min(rms * 10, 1));

    // Single pitch detection
    const pitch = detector.detectPitch();
    setCurrentPitch(pitch);

    // Chromagram for chord detection
    const chroma = detector.getChroma();
    setCurrentChroma(chroma);

    if (chroma.activePitchClasses.length >= 2) {
      const chord = detectChordFromChroma(chroma.chroma);
      setDetectedChord(chord);
    } else if (chroma.rms < 0.01) {
      setDetectedChord(null);
    }

    // Track note history for interval detection
    if (pitch && pitch.confidence > 0.5) {
      const now = Date.now();
      if (pitch.midi !== lastMidiRef.current || now - lastMidiTimeRef.current > 500) {
        lastMidiRef.current = pitch.midi;
        lastMidiTimeRef.current = now;
        setNoteHistory(prev => [...prev.slice(-4), pitch.midi]);
      }
    }

    rafRef.current = requestAnimationFrame(analyze);
  }, []);

  const startListening = async () => {
    setError(null);
    setConnecting(true);

    // Check if microphone API is available (requires HTTPS on non-localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      setConnecting(false);
      if (!isLocalhost) {
        setError('Microphone requires HTTPS. Open this page on your laptop at localhost:3000, or use a tunnel (ngrok) for phone access.');
      } else {
        setError('Microphone API not available in this browser.');
      }
      return;
    }

    try {
      unlockAudio();
      if (!detectorRef.current) {
        detectorRef.current = new PitchDetector();
      }
      await detectorRef.current.start();
      setConnecting(false);
      setIsListening(true);
      rafRef.current = requestAnimationFrame(analyze);
    } catch (err) {
      setConnecting(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Microphone permission denied. Tap the lock icon in your browser and allow microphone access.');
      } else if (msg.includes('secure') || msg.includes('HTTPS')) {
        setError('Microphone requires HTTPS. Open localhost:3000 on your laptop, or use ngrok for phone.');
      } else {
        setError(`Microphone error: ${msg}`);
      }
    }
  };

  const stopListening = () => {
    detectorRef.current?.stop();
    cancelAnimationFrame(rafRef.current);
    setIsListening(false);
    setCurrentPitch(null);
    setCurrentChroma(null);
    setDetectedChord(null);
    setVolume(0);
  };

  useEffect(() => {
    return () => {
      detectorRef.current?.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Determine active notes for keyboard display
  const activePitchClasses = currentChroma?.activePitchClasses ?? [];
  const singleNote = currentPitch?.midi;
  const centsOff = currentPitch ? freqToCentsOff(currentPitch.frequency) : 0;

  // Calculate interval from last two distinct notes
  const lastTwoNotes = noteHistory.slice(-2);
  const currentInterval = lastTwoNotes.length === 2
    ? Math.abs(lastTwoNotes[1] - lastTwoNotes[0])
    : null;

  // Volume bars
  const volumeBars = 8;
  const activeVolumeBars = Math.round(volume * volumeBars);

  return (
    <div className="flex flex-col items-center flex-1 px-4 py-4 gap-4">
      <h2 className="text-sm text-amber" style={{ fontFamily: 'var(--font-pixel)' }}>
        LISTEN MODE
      </h2>

      {/* Main display screen */}
      <div className="crt-screen w-full max-w-lg p-6 flex flex-col items-center gap-4 min-h-[200px]">
        {!isListening ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-[9px] text-cream-dim text-center" style={{ fontFamily: 'var(--font-pixel)' }}>
              {connecting ? 'Connecting to microphone...' : 'Tap to start listening to your piano'}
            </p>
            <button
              onClick={startListening}
              disabled={connecting}
              className={`retro-btn retro-btn-pink retro-btn-big ${connecting ? 'animate-pulse-glow opacity-70' : ''}`}
            >
              {connecting ? 'Connecting...' : 'Start Listening'}
            </button>
          </div>
        ) : (
          <>
            {/* Volume meter */}
            <div className="volume-meter">
              {Array.from({ length: volumeBars }).map((_, i) => (
                <div
                  key={i}
                  className="volume-bar"
                  style={{
                    height: i < activeVolumeBars ? `${((i + 1) / volumeBars) * 24}px` : '3px',
                    background: i < activeVolumeBars
                      ? (i > volumeBars * 0.7 ? '#ff6e6c' : '#23d5ab')
                      : '#241346',
                  }}
                />
              ))}
            </div>

            {/* Detected note */}
            {singleNote ? (
              <div className="text-center">
                <p className="text-3xl text-pink glow-text" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {midiToNoteName(singleNote)}
                </p>
                <p className="text-[8px] text-cream-dim mt-1" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {currentPitch?.frequency.toFixed(1)} Hz
                  {' '}
                  <span className={Math.abs(centsOff) < 10 ? 'text-green' : 'text-coral'}>
                    {centsOff > 0 ? '+' : ''}{centsOff.toFixed(0)}¢
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-cream-dim animate-pulse-glow" style={{ fontFamily: 'var(--font-pixel)' }}>
                Play something...
              </p>
            )}

            {/* Detected chord */}
            {detectedChord && (
              <div className="text-center mt-2">
                <p className="text-[8px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>CHORD</p>
                <p className="text-xl text-amber glow-text" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {formatChord(detectedChord)}
                </p>
                <p className="text-[8px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {formatChordFull(detectedChord)}
                </p>
                <p className="text-[7px] text-teal mt-1" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {detectedChord.notes.map(pc => pitchClassName(pc)).join(' - ')}
                </p>
              </div>
            )}

            {/* Detected interval */}
            {currentInterval !== null && currentInterval > 0 && currentInterval <= 12 && (
              <div className="text-center mt-2">
                <p className="text-[8px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>INTERVAL</p>
                <p className="text-sm text-teal" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {getIntervalName(currentInterval)}
                </p>
                <p className="text-[7px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {midiToNoteName(lastTwoNotes[0])} → {midiToNoteName(lastTwoNotes[1])}
                </p>
              </div>
            )}

            {/* Stop button */}
            <button
              onClick={stopListening}
              className="retro-btn retro-btn-pink text-[8px] mt-2"
            >
              Stop
            </button>
          </>
        )}

        {error && (
          <p className="text-[8px] text-pink text-center" style={{ fontFamily: 'var(--font-pixel)' }}>
            {error}
          </p>
        )}
      </div>

      {/* Piano keyboard visualization */}
      <div className="w-full max-w-lg overflow-hidden">
        <PianoKeyboard
          startMidi={48}
          endMidi={72}
          activeNotes={activePitchClasses}
          activeMode="pitchClass"
        />
      </div>

      {/* Chromagram visualization */}
      {isListening && currentChroma && (
        <div className="w-full max-w-lg">
          <p className="text-[7px] text-cream-dim mb-2 text-center" style={{ fontFamily: 'var(--font-pixel)' }}>
            PITCH ENERGY
          </p>
          <div className="flex justify-between items-end h-16 px-2">
            {NOTE_NAMES.map((name, i) => (
              <div key={name} className="flex flex-col items-center gap-1">
                <div
                  className="w-4 rounded-t"
                  style={{
                    height: `${(currentChroma.chroma[i] ?? 0) * 50}px`,
                    background: activePitchClasses.includes(i) ? '#ff6e6c' : '#541388',
                    transition: 'height 0.1s',
                    minHeight: '2px',
                  }}
                />
                <span className="text-[6px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
