import { useEffect, useMemo, useRef } from 'react';

export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  });
  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  return useMemo(() => {
    return (...args: A) => {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => callbackRef.current(...args), delayMs);
    };
  }, [delayMs]);
}
