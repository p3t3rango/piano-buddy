// Scale definitions for ear training

export interface ScaleDef {
  name: string;
  intervals: number[]; // Semitones from root
  difficulty: 1 | 2 | 3;
  color: string;
}

export const SCALES: ScaleDef[] = [
  { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], difficulty: 1, color: '#ffd93d' },
  { name: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10], difficulty: 1, color: '#23d5ab' },
  { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], difficulty: 2, color: '#c56cf0' },
  { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11], difficulty: 2, color: '#ff6e6c' },
  { name: 'Pentatonic Major', intervals: [0, 2, 4, 7, 9], difficulty: 1, color: '#ff8e72' },
  { name: 'Pentatonic Minor', intervals: [0, 3, 5, 7, 10], difficulty: 1, color: '#4ecdc4' },
  { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], difficulty: 2, color: '#6bcb77' },
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], difficulty: 2, color: '#ffd93d' },
  { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], difficulty: 3, color: '#23d5ab' },
  { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11], difficulty: 2, color: '#c56cf0' },
  { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], difficulty: 2, color: '#ff6e6c' },
  { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10], difficulty: 3, color: '#ff8e72' },
  { name: 'Whole Tone', intervals: [0, 2, 4, 6, 8, 10], difficulty: 3, color: '#4ecdc4' },
  { name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], difficulty: 3, color: '#6bcb77' },
];

export function getScalesByDifficulty(maxDifficulty: 1 | 2 | 3): ScaleDef[] {
  return SCALES.filter(s => s.difficulty <= maxDifficulty);
}

// Common chord progressions for training
export interface ProgressionDef {
  name: string;
  numerals: string[];
  degrees: number[]; // Scale degrees (0-indexed)
  chordQualities: ('major' | 'minor' | 'diminished' | 'dominant7')[];
  difficulty: 1 | 2 | 3;
}

export const PROGRESSIONS: ProgressionDef[] = [
  {
    name: 'I - IV - V - I',
    numerals: ['I', 'IV', 'V', 'I'],
    degrees: [0, 5, 7, 0],
    chordQualities: ['major', 'major', 'major', 'major'],
    difficulty: 1,
  },
  {
    name: 'I - V - vi - IV',
    numerals: ['I', 'V', 'vi', 'IV'],
    degrees: [0, 7, 9, 5],
    chordQualities: ['major', 'major', 'minor', 'major'],
    difficulty: 1,
  },
  {
    name: 'ii - V - I',
    numerals: ['ii', 'V', 'I'],
    degrees: [2, 7, 0],
    chordQualities: ['minor', 'major', 'major'],
    difficulty: 2,
  },
  {
    name: 'I - vi - IV - V',
    numerals: ['I', 'vi', 'IV', 'V'],
    degrees: [0, 9, 5, 7],
    chordQualities: ['major', 'minor', 'major', 'major'],
    difficulty: 1,
  },
  {
    name: 'vi - IV - I - V',
    numerals: ['vi', 'IV', 'I', 'V'],
    degrees: [9, 5, 0, 7],
    chordQualities: ['minor', 'major', 'major', 'major'],
    difficulty: 1,
  },
  {
    name: 'I - IV - vi - V',
    numerals: ['I', 'IV', 'vi', 'V'],
    degrees: [0, 5, 9, 7],
    chordQualities: ['major', 'major', 'minor', 'major'],
    difficulty: 1,
  },
  {
    name: 'ii - V - I - vi',
    numerals: ['ii', 'V', 'I', 'vi'],
    degrees: [2, 7, 0, 9],
    chordQualities: ['minor', 'dominant7', 'major', 'minor'],
    difficulty: 2,
  },
  {
    name: 'I - iii - IV - V',
    numerals: ['I', 'iii', 'IV', 'V'],
    degrees: [0, 4, 5, 7],
    chordQualities: ['major', 'minor', 'major', 'major'],
    difficulty: 2,
  },
  {
    name: 'i - bVII - bVI - V',
    numerals: ['i', 'bVII', 'bVI', 'V'],
    degrees: [0, 10, 8, 7],
    chordQualities: ['minor', 'major', 'major', 'major'],
    difficulty: 2,
  },
  {
    name: 'I - bVII - IV - I',
    numerals: ['I', 'bVII', 'IV', 'I'],
    degrees: [0, 10, 5, 0],
    chordQualities: ['major', 'major', 'major', 'major'],
    difficulty: 2,
  },
  {
    name: 'ii7 - V7 - Imaj7',
    numerals: ['ii7', 'V7', 'Imaj7'],
    degrees: [2, 7, 0],
    chordQualities: ['minor', 'dominant7', 'major'],
    difficulty: 3,
  },
  {
    name: 'I - vi - ii - V (Rhythm Changes)',
    numerals: ['I', 'vi', 'ii', 'V'],
    degrees: [0, 9, 2, 7],
    chordQualities: ['major', 'minor', 'minor', 'dominant7'],
    difficulty: 3,
  },
];

export function getProgressionsByDifficulty(maxDifficulty: 1 | 2 | 3): ProgressionDef[] {
  return PROGRESSIONS.filter(p => p.difficulty <= maxDifficulty);
}
