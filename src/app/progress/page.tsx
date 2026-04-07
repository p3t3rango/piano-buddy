'use client';

import { useEffect, useState } from 'react';
import { loadProgress, xpForLevel, type ProgressData, resetProgress } from '@/lib/progress/store';

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    setData(loadProgress());
  }, []);

  if (!data) return null;

  const xpNeeded = xpForLevel(data.level);
  const xpPct = Math.min((data.xp / xpNeeded) * 100, 100);
  const overallAccuracy = data.totalExercises > 0
    ? Math.round((data.totalCorrect / data.totalExercises) * 100)
    : 0;

  // Recent 7 days of stats
  const recentDays = data.dailyStats.slice(-7).reverse();

  // Per-type breakdowns
  const sections = [
    { title: 'INTERVALS', data: data.intervalAccuracy, color: 'pink' },
    { title: 'CHORDS', data: data.chordAccuracy, color: 'amber' },
    { title: 'SCALES', data: data.scaleAccuracy, color: 'teal' },
    { title: 'PROGRESSIONS', data: data.progressionAccuracy, color: 'purple' },
  ];

  const handleReset = () => {
    resetProgress();
    setData(loadProgress());
    setShowReset(false);
  };

  return (
    <div className="flex flex-col items-center flex-1 px-4 py-4 gap-4">
      <h2 className="text-sm text-purple" style={{ fontFamily: 'var(--font-pixel)' }}>
        PROGRESS
      </h2>

      {/* Level & XP */}
      <div className="crt-screen w-full max-w-lg p-6 flex flex-col items-center gap-3">
        <div className="text-center">
          <p className="text-[8px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>LEVEL</p>
          <p className="text-3xl text-amber glow-text" style={{ fontFamily: 'var(--font-pixel)' }}>
            {data.level}
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <p className="text-[7px] text-cream-dim text-center mt-1" style={{ fontFamily: 'var(--font-pixel)' }}>
            {data.xp} / {xpNeeded} XP
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mt-2 w-full">
          <div className="text-center">
            <p className="text-lg text-teal" style={{ fontFamily: 'var(--font-pixel)' }}>
              {data.streak}
            </p>
            <p className="text-[7px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
              {data.streak > 1 ? '🔥' : ''} Streak
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg text-pink" style={{ fontFamily: 'var(--font-pixel)' }}>
              {data.totalExercises}
            </p>
            <p className="text-[7px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
              Total
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg text-green" style={{ fontFamily: 'var(--font-pixel)' }}>
              {overallAccuracy}%
            </p>
            <p className="text-[7px] text-cream-dim" style={{ fontFamily: 'var(--font-pixel)' }}>
              Accuracy
            </p>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {recentDays.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="text-[8px] text-cream-dim mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
            RECENT DAYS
          </p>
          <div className="flex gap-2">
            {recentDays.map(day => {
              const dayAcc = day.totalExercises > 0
                ? Math.round((day.correct / day.totalExercises) * 100)
                : 0;
              return (
                <div key={day.date} className="crt-screen p-2 flex-1 text-center min-w-0">
                  <p className="text-[6px] text-cream-dim truncate" style={{ fontFamily: 'var(--font-pixel)' }}>
                    {day.date.slice(5)}
                  </p>
                  <p className="text-[10px] text-amber" style={{ fontFamily: 'var(--font-pixel)' }}>
                    {day.totalExercises}
                  </p>
                  <p className="text-[6px] text-teal" style={{ fontFamily: 'var(--font-pixel)' }}>
                    {dayAcc}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-type accuracy breakdowns */}
      {sections.map(section => {
        const entries = Object.entries(section.data).sort((a, b) => b[1].total - a[1].total);
        if (entries.length === 0) return null;
        return (
          <div key={section.title} className="w-full max-w-lg">
            <p className={`text-[8px] text-${section.color} mb-2`} style={{ fontFamily: 'var(--font-pixel)' }}>
              {section.title}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {entries.slice(0, 8).map(([name, stats]) => {
                const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                return (
                  <div key={name} className="crt-screen p-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[7px] text-cream truncate" style={{ fontFamily: 'var(--font-pixel)' }}>
                        {name}
                      </p>
                      <div className="xp-bar-track h-1 mt-1">
                        <div className="xp-bar-fill h-full" style={{ width: `${acc}%` }} />
                      </div>
                    </div>
                    <p className="text-[7px] text-teal whitespace-nowrap" style={{ fontFamily: 'var(--font-pixel)' }}>
                      {acc}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Reset button */}
      <div className="mt-4 mb-8">
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            className="text-[7px] text-cream-dim opacity-50 hover:opacity-100"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            Reset Progress
          </button>
        ) : (
          <div className="flex gap-3 items-center">
            <p className="text-[7px] text-pink" style={{ fontFamily: 'var(--font-pixel)' }}>Are you sure?</p>
            <button onClick={handleReset} className="retro-btn retro-btn-pink text-[7px] px-3 py-1">
              Yes
            </button>
            <button onClick={() => setShowReset(false)} className="retro-btn text-[7px] px-3 py-1">
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
