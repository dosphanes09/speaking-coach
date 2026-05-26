import { useEffect, useRef, useState } from "react";

export function useCountdown(initialSeconds: number, onComplete?: () => void) {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.();
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, onComplete]);

  function start(): void {
    completedRef.current = false;
    setIsRunning(true);
  }

  function reset(seconds = initialSeconds): void {
    completedRef.current = false;
    setRemainingSeconds(seconds);
    setIsRunning(false);
  }

  function skip(): void {
    setRemainingSeconds(0);
    setIsRunning(false);
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }

  return {
    remainingSeconds,
    isRunning,
    start,
    reset,
    skip
  };
}
