'use client';

import { isBlackKey, midiToNoteName, midiToPitchClass, NOTE_NAMES } from '@/lib/music/theory';

interface PianoKeyboardProps {
  startMidi?: number; // Default C3 = 48
  endMidi?: number;   // Default C5 = 72
  activeNotes?: number[]; // MIDI notes or pitch classes currently active
  activeMode?: 'midi' | 'pitchClass'; // How to interpret activeNotes
  highlightColor?: string;
  onKeyPress?: (midi: number) => void;
  compact?: boolean;
}

export default function PianoKeyboard({
  startMidi = 48,
  endMidi = 72,
  activeNotes = [],
  activeMode = 'midi',
  highlightColor,
  onKeyPress,
  compact = false,
}: PianoKeyboardProps) {
  const whiteKeys: number[] = [];
  const blackKeyMap: Map<number, number> = new Map(); // midi -> position index among white keys

  for (let midi = startMidi; midi <= endMidi; midi++) {
    if (!isBlackKey(midi)) {
      whiteKeys.push(midi);
    }
  }

  // Build black key positions relative to white keys
  let whiteIndex = 0;
  for (let midi = startMidi; midi <= endMidi; midi++) {
    if (!isBlackKey(midi)) {
      whiteIndex++;
    } else {
      blackKeyMap.set(midi, whiteIndex);
    }
  }

  const isActive = (midi: number) => {
    if (activeMode === 'pitchClass') {
      return activeNotes.includes(midiToPitchClass(midi));
    }
    return activeNotes.includes(midi);
  };

  const whiteKeyWidth = compact ? 20 : 28;
  const whiteKeyHeight = compact ? 80 : 120;
  const blackKeyWidth = compact ? 14 : 18;
  const blackKeyHeight = compact ? 50 : 75;
  const totalWidth = whiteKeys.length * whiteKeyWidth;

  return (
    <div className="relative overflow-x-auto" style={{ maxWidth: '100%' }}>
      <div className="relative mx-auto" style={{ width: totalWidth, height: whiteKeyHeight }}>
        {/* White keys */}
        {whiteKeys.map((midi, i) => {
          const active = isActive(midi);
          const noteName = midiToNoteName(midi);
          const isC = midiToPitchClass(midi) === 0;
          return (
            <button
              key={midi}
              className={`piano-key-white absolute top-0 ${active ? 'active' : ''}`}
              style={{
                left: i * whiteKeyWidth,
                width: whiteKeyWidth - 1,
                height: whiteKeyHeight,
                ...(active && highlightColor ? { background: highlightColor, boxShadow: `0 0 12px ${highlightColor}` } : {}),
              }}
              onClick={() => onKeyPress?.(midi)}
              aria-label={noteName}
            >
              {isC && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-500"
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  {noteName}
                </span>
              )}
            </button>
          );
        })}

        {/* Black keys */}
        {Array.from(blackKeyMap.entries()).map(([midi, wIdx]) => {
          const active = isActive(midi);
          return (
            <button
              key={midi}
              className={`piano-key-black absolute top-0 ${active ? 'active' : ''}`}
              style={{
                left: (wIdx - 1) * whiteKeyWidth + whiteKeyWidth - blackKeyWidth / 2,
                width: blackKeyWidth,
                height: blackKeyHeight,
                ...(active && highlightColor ? { background: highlightColor, boxShadow: `0 0 12px ${highlightColor}` } : {}),
              }}
              onClick={() => onKeyPress?.(midi)}
              aria-label={midiToNoteName(midi)}
            />
          );
        })}
      </div>

      {/* Note name labels */}
      <div className="flex justify-center mt-1 gap-0" style={{ width: totalWidth, margin: '0 auto' }}>
        {activeNotes.length > 0 && (
          <div className="text-center w-full mt-2">
            <span className="text-amber text-xs">
              {activeNotes.map(n =>
                activeMode === 'pitchClass' ? NOTE_NAMES[n] : midiToNoteName(n)
              ).join(' ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
