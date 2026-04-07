'use client';

import { useEffect, useState } from 'react';
import { loadProgress, xpForLevel } from '@/lib/progress/store';

export default function XPBar() {
  const [progress, setProgress] = useState({ xp: 0, level: 1, streak: 0 });

  useEffect(() => {
    const data = loadProgress();
    setProgress({ xp: data.xp, level: data.level, streak: data.streak });
  }, []);

  const needed = xpForLevel(progress.level);
  const pct = Math.min((progress.xp / needed) * 100, 100);

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="text-[8px] text-amber whitespace-nowrap">
        LV {progress.level}
      </div>
      <div className="xp-bar-track flex-1">
        <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[7px] text-cream-dim whitespace-nowrap">
        {progress.xp}/{needed} XP
      </div>
      {progress.streak > 1 && (
        <div className="text-[8px] text-coral whitespace-nowrap">
          <span className="streak-fire">🔥</span> {progress.streak}d
        </div>
      )}
    </div>
  );
}
