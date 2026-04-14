'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext, playMetronomeBeat, playSfx, unlockAudio } from '@/lib/audio/synth';

type Tempo = 80 | 100 | 120;
type Beats = 8 | 16;

interface Result {
  perTap: { beat: number; offsetMs: number | null }[];
  avgAbsMs: number;
  hit: number; // within 150ms window
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

function gradeFor(avg: number, hit: number, total: number): Result['grade'] {
  const hitPct = hit / total;
  if (avg < 30 && hitPct === 1) return 'S';
  if (avg < 60 && hitPct >= 0.9) return 'A';
  if (avg < 100 && hitPct >= 0.75) return 'B';
  if (avg < 150 && hitPct >= 0.5) return 'C';
  return 'D';
}

export default function RhythmPage() {
  const [tempo, setTempo] = useState<Tempo>(100);
  const [beats, setBeats] = useState<Beats>(8);
  const [running, setRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [tapOffsets, setTapOffsets] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  const beatTimesRef = useRef<number[]>([]);    // audio-context times
  const capturedRef = useRef<boolean[]>([]);
  const tapOffsetsRef = useRef<(number | null)[]>([]);
  const schedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = () => {
    if (schedTimerRef.current) {
      clearInterval(schedTimerRef.current);
      schedTimerRef.current = null;
    }
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
  };
  useEffect(() => cleanup, []);

  const finish = useCallback(() => {
    cleanup();
    const offsets = tapOffsetsRef.current;
    const caught = offsets.filter((x): x is number => x !== null);
    const avgAbs = caught.length
      ? caught.reduce((a, b) => a + Math.abs(b), 0) / caught.length
      : 999;
    const hit = offsets.filter(x => x !== null && Math.abs(x) < 150).length;
    const grade = gradeFor(avgAbs, hit, offsets.length);
    setResult({
      perTap: offsets.map((offsetMs, i) => ({ beat: i + 1, offsetMs })),
      avgAbsMs: Math.round(avgAbs),
      hit,
      grade,
    });
    setRunning(false);
    setCurrentBeat(-1);
    playSfx(grade === 'S' || grade === 'A' ? 'levelup' : grade === 'D' ? 'incorrect' : 'correct');
  }, []);

  const start = () => {
    unlockAudio();
    const ctx = getAudioContext();
    const beatDur = 60 / tempo;
    const t0 = ctx.currentTime + 0.7; // pre-roll
    const times: number[] = [];
    for (let i = 0; i < beats; i++) times.push(t0 + i * beatDur);
    beatTimesRef.current = times;
    capturedRef.current = new Array(beats).fill(false);
    tapOffsetsRef.current = new Array(beats).fill(null);
    setTapOffsets(new Array(beats).fill(null));
    setResult(null);
    setRunning(true);
    setCurrentBeat(-1);

    // Schedule clicks with a lookahead scheduler — each beat that falls within
    // the next 150ms gets a setTimeout with its remaining delay.
    let scheduled = 0;
    schedTimerRef.current = setInterval(() => {
      const now = ctx.currentTime;
      while (scheduled < beats && times[scheduled] - now < 0.15) {
        const bi = scheduled;
        const delay = Math.max(0, (times[bi] - now) * 1000);
        setTimeout(() => {
          playMetronomeBeat(bi === 0 ? 2 : 1, 'click');
          setCurrentBeat(bi);
        }, delay);
        scheduled += 1;
      }
      if (scheduled >= beats) {
        if (schedTimerRef.current) {
          clearInterval(schedTimerRef.current);
          schedTimerRef.current = null;
        }
        const endDelay = (times[beats - 1] - ctx.currentTime + 0.5) * 1000;
        endTimerRef.current = setTimeout(finish, Math.max(0, endDelay));
      }
    }, 25);
  };

  const tap = useCallback(() => {
    if (!running) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const times = beatTimesRef.current;
    let nearestIdx = -1;
    let nearestAbs = Infinity;
    for (let i = 0; i < times.length; i++) {
      if (capturedRef.current[i]) continue;
      const diff = Math.abs(now - times[i]);
      if (diff < nearestAbs) {
        nearestAbs = diff;
        nearestIdx = i;
      }
    }
    if (nearestIdx < 0 || nearestAbs > 0.45) return;
    capturedRef.current[nearestIdx] = true;
    const offsetMs = Math.round((now - times[nearestIdx]) * 1000);
    tapOffsetsRef.current[nearestIdx] = offsetMs;
    setTapOffsets([...tapOffsetsRef.current]);
  }, [running]);

  // Space bar also taps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tap]);

  const stop = () => {
    cleanup();
    setRunning(false);
    setCurrentBeat(-1);
  };

  return (
    <div className="flex flex-col items-center flex-1 px-4 py-4 gap-4">
      <h2 className="text-sm text-amber" style={{ fontFamily: 'var(--font-pixel)' }}>
        RHYTHM
      </h2>

      <p className="text-[8px] text-cream-dim text-center max-w-sm" style={{ fontFamily: 'var(--font-pixel)' }}>
        Tap the button (or Space) on every click. We'll grade your timing.
      </p>

      {/* Settings */}
      <div className="flex gap-2 flex-wrap justify-center">
        {([80, 100, 120] as Tempo[]).map(t => (
          <button
            key={t}
            onClick={() => { if (!running) setTempo(t); }}
            disabled={running}
            className={`badge ${t === 80 ? 'badge-easy' : t === 100 ? 'badge-medium' : 'badge-hard'} ${tempo === t ? 'ring-1 ring-current' : 'opacity-50'}`}
          >
            {t} BPM
          </button>
        ))}
        <span className="text-[7px] text-cream-dim mx-1 self-center" style={{ fontFamily: 'var(--font-pixel)' }}>|</span>
        {([8, 16] as Beats[]).map(b => (
          <button
            key={b}
            onClick={() => { if (!running) setBeats(b); }}
            disabled={running}
            className={`badge badge-easy ${beats === b ? 'ring-1 ring-current' : 'opacity-50'}`}
          >
            {b} beats
          </button>
        ))}
      </div>

      {/* Beat indicator */}
      <div className="crt-screen w-full max-w-lg p-6 flex flex-col items-center gap-3 min-h-[160px]">
        {!running && !result && (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-[9px] text-cream-dim text-center" style={{ fontFamily: 'var(--font-pixel)' }}>
              Ready?
            </p>
            <button onClick={start} className="retro-btn retro-btn-amber retro-btn-big">
              Start
            </button>
          </div>
        )}

        {running && (
          <>
            <p className="text-[8px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
              BEAT {currentBeat + 1} / {beats}
            </p>
            <div className="flex gap-1 flex-wrap justify-center">
              {Array.from({ length: beats }).map((_, i) => {
                const isDone = tapOffsets[i] !== null;
                const isCurrent = i === currentBeat;
                return (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-sm ${
                      isDone ? 'bg-green' : isCurrent ? 'bg-amber' : 'bg-cream-dim opacity-30'
                    }`}
                  />
                );
              })}
            </div>
            <button onClick={tap} className="retro-btn retro-btn-teal retro-btn-big mt-2">
              TAP
            </button>
            <button onClick={stop} className="text-[7px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
              Cancel
            </button>
          </>
        )}

        {result && !running && (
          <>
            <p className="text-4xl glow-text text-amber" style={{ fontFamily: 'var(--font-pixel)' }}>
              {result.grade}
            </p>
            <p className="text-[9px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
              Avg error: <span className="text-teal">{result.avgAbsMs} ms</span>
            </p>
            <p className="text-[9px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
              Hit: <span className="text-teal">{result.hit}/{beats}</span>
            </p>
            <div className="flex gap-1 flex-wrap justify-center mt-1 max-w-xs">
              {result.perTap.map(({ beat, offsetMs }) => (
                <span
                  key={beat}
                  className={`text-[7px] px-1 ${
                    offsetMs === null
                      ? 'text-pink'
                      : Math.abs(offsetMs) < 50
                      ? 'text-green'
                      : Math.abs(offsetMs) < 100
                      ? 'text-teal'
                      : Math.abs(offsetMs) < 150
                      ? 'text-amber'
                      : 'text-pink'
                  }`}
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  {offsetMs === null ? '×' : (offsetMs > 0 ? '+' : '') + offsetMs}
                </span>
              ))}
            </div>
            <button onClick={start} className="retro-btn retro-btn-teal retro-btn-big mt-2">
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
