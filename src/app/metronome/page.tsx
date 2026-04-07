'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { playMetronomeTick, playSfx, unlockAudio } from '@/lib/audio/synth';

const MIN_BPM = 30;
const MAX_BPM = 240;
const TIME_SIGNATURES = [
  { beats: 4, label: '4/4' },
  { beats: 3, label: '3/4' },
  { beats: 2, label: '2/4' },
  { beats: 6, label: '6/8' },
];

export default function MetronomePage() {
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [timeSigIndex, setTimeSigIndex] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatRef = useRef(0);

  const timeSig = TIME_SIGNATURES[timeSigIndex];

  const startMetronome = useCallback(() => {
    unlockAudio();
    beatRef.current = 0;
    setCurrentBeat(0);
    playMetronomeTick(true);

    const ms = (60 / bpm) * 1000;
    intervalRef.current = setInterval(() => {
      beatRef.current = (beatRef.current + 1) % timeSig.beats;
      setCurrentBeat(beatRef.current);
      playMetronomeTick(beatRef.current === 0);
    }, ms);

    setPlaying(true);
  }, [bpm, timeSig.beats]);

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlaying(false);
    setCurrentBeat(0);
  }, []);

  // Restart when BPM or time sig changes while playing
  useEffect(() => {
    if (playing) {
      stopMetronome();
      startMetronome();
    }
  }, [bpm, timeSigIndex]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const adjustBpm = (delta: number) => {
    setBpm(prev => Math.max(MIN_BPM, Math.min(MAX_BPM, prev + delta)));
  };

  return (
    <div className="flex flex-col items-center flex-1 px-4 py-6 gap-6">
      <h2 className="text-sm text-teal" style={{ fontFamily: 'var(--font-pixel)' }}>
        METRONOME
      </h2>

      {/* Main display */}
      <div className="crt-screen w-full max-w-sm p-8 flex flex-col items-center gap-6">
        {/* BPM display */}
        <div className="text-center">
          <p className="text-4xl text-amber glow-text" style={{ fontFamily: 'var(--font-pixel)' }}>
            {bpm}
          </p>
          <p className="text-[8px] text-cream-dim mt-1" style={{ fontFamily: 'var(--font-pixel)' }}>
            BPM
          </p>
        </div>

        {/* BPM controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => adjustBpm(-10)}
            className="retro-btn text-[10px] px-4 py-3"
          >
            -10
          </button>
          <button
            onClick={() => adjustBpm(-1)}
            className="retro-btn text-[10px] px-4 py-3"
          >
            -1
          </button>
          <button
            onClick={() => adjustBpm(1)}
            className="retro-btn text-[10px] px-4 py-3"
          >
            +1
          </button>
          <button
            onClick={() => adjustBpm(10)}
            className="retro-btn text-[10px] px-4 py-3"
          >
            +10
          </button>
        </div>

        {/* BPM slider */}
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
          className="w-full accent-amber"
          style={{ accentColor: 'var(--color-amber)' }}
        />

        {/* Beat visualization */}
        <div className="flex gap-3">
          {Array.from({ length: timeSig.beats }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full border-2 transition-all duration-100 flex items-center justify-center"
              style={{
                borderColor: i === currentBeat && playing ? '#ff6e6c' : '#541388',
                background: i === currentBeat && playing
                  ? (i === 0 ? '#ff6e6c' : '#ffd93d')
                  : 'transparent',
                boxShadow: i === currentBeat && playing
                  ? `0 0 12px ${i === 0 ? '#ff6e6c' : '#ffd93d'}`
                  : 'none',
              }}
            >
              <span
                className="text-[8px]"
                style={{
                  fontFamily: 'var(--font-pixel)',
                  color: i === currentBeat && playing ? '#0d0221' : '#541388',
                }}
              >
                {i + 1}
              </span>
            </div>
          ))}
        </div>

        {/* Time signature */}
        <div className="flex gap-2">
          {TIME_SIGNATURES.map((ts, i) => (
            <button
              key={ts.label}
              onClick={() => setTimeSigIndex(i)}
              className={`badge ${i === timeSigIndex ? 'badge-easy ring-1 ring-current' : 'badge-easy opacity-50'}`}
            >
              {ts.label}
            </button>
          ))}
        </div>
      </div>

      {/* Play/Stop button */}
      <button
        onClick={playing ? stopMetronome : startMetronome}
        className={`retro-btn retro-btn-big ${playing ? 'retro-btn-pink' : 'retro-btn-teal'}`}
      >
        {playing ? '■ Stop' : '▶ Start'}
      </button>

      {/* Common tempos */}
      <div className="w-full max-w-sm">
        <p className="text-[7px] text-cream-dim mb-2 text-center" style={{ fontFamily: 'var(--font-pixel)' }}>
          PRESETS
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { bpm: 60, label: 'Largo' },
            { bpm: 80, label: 'Adagio' },
            { bpm: 100, label: 'Andante' },
            { bpm: 120, label: 'Allegro' },
            { bpm: 140, label: 'Vivace' },
            { bpm: 180, label: 'Presto' },
          ].map(preset => (
            <button
              key={preset.bpm}
              onClick={() => setBpm(preset.bpm)}
              className={`retro-btn text-[7px] px-3 py-2 ${bpm === preset.bpm ? 'retro-btn-amber' : ''}`}
            >
              {preset.label}
              <br />
              <span className="opacity-60">{preset.bpm}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
