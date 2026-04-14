'use client';

import { useEffect } from 'react';

/**
 * Binds digit keys 1..9 to a sequence of callbacks — pressing "1" invokes
 * onPress[0], "2" invokes onPress[1], etc. Useful for multiple-choice
 * training pages where each answer button has a 1-9 shortcut.
 *
 * Pass `disabled: true` when the question has been answered so the keys
 * don't trigger duplicate submissions.
 */
export function useAnswerShortcuts(
  count: number,
  onPick: (index: number) => void,
  disabled: boolean,
): void {
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      if (n > count) return;
      e.preventDefault();
      onPick(n - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [count, onPick, disabled]);
}

/**
 * Bind a single key to a callback. Useful for "Enter" = next, "R" = replay.
 */
export function useKeyShortcut(
  key: string,
  onPress: () => void,
  disabled = false,
): void {
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key !== key) return;
      e.preventDefault();
      onPress();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, onPress, disabled]);
}
