// Interval definitions for ear training

export interface IntervalDef {
  semitones: number;
  name: string;
  shortName: string;
  quality: 'perfect' | 'major' | 'minor' | 'augmented' | 'diminished';
  difficulty: 1 | 2 | 3; // 1=beginner, 2=intermediate, 3=advanced
  color: string; // For UI display
}

export const INTERVALS: IntervalDef[] = [
  { semitones: 0, name: 'Unison', shortName: 'P1', quality: 'perfect', difficulty: 1, color: '#ff6e6c' },
  { semitones: 1, name: 'Minor 2nd', shortName: 'm2', quality: 'minor', difficulty: 2, color: '#ff8e72' },
  { semitones: 2, name: 'Major 2nd', shortName: 'M2', quality: 'major', difficulty: 1, color: '#ffd93d' },
  { semitones: 3, name: 'Minor 3rd', shortName: 'm3', quality: 'minor', difficulty: 1, color: '#23d5ab' },
  { semitones: 4, name: 'Major 3rd', shortName: 'M3', quality: 'major', difficulty: 1, color: '#4ecdc4' },
  { semitones: 5, name: 'Perfect 4th', shortName: 'P4', quality: 'perfect', difficulty: 1, color: '#6bcb77' },
  { semitones: 6, name: 'Tritone', shortName: 'TT', quality: 'augmented', difficulty: 2, color: '#c56cf0' },
  { semitones: 7, name: 'Perfect 5th', shortName: 'P5', quality: 'perfect', difficulty: 1, color: '#ff6e6c' },
  { semitones: 8, name: 'Minor 6th', shortName: 'm6', quality: 'minor', difficulty: 2, color: '#ff8e72' },
  { semitones: 9, name: 'Major 6th', shortName: 'M6', quality: 'major', difficulty: 2, color: '#ffd93d' },
  { semitones: 10, name: 'Minor 7th', shortName: 'm7', quality: 'minor', difficulty: 2, color: '#23d5ab' },
  { semitones: 11, name: 'Major 7th', shortName: 'M7', quality: 'major', difficulty: 2, color: '#4ecdc4' },
  { semitones: 12, name: 'Octave', shortName: 'P8', quality: 'perfect', difficulty: 1, color: '#6bcb77' },
];

export function getInterval(semitones: number): IntervalDef | undefined {
  return INTERVALS.find(i => i.semitones === semitones);
}

export function getIntervalName(semitones: number): string {
  const interval = getInterval(Math.abs(semitones) % 13);
  return interval?.name ?? `${semitones} semitones`;
}

export function getIntervalsByDifficulty(maxDifficulty: 1 | 2 | 3): IntervalDef[] {
  return INTERVALS.filter(i => i.difficulty <= maxDifficulty);
}
