import { useEffect, useRef, useState } from 'react';

/**
 * A looping playback clock for previews that have no real video (the demo
 * project, template thumbnails). Real videos use the player's own time.
 */
export function usePlaybackClock(duration: number, { autoPlay = true, tail = 0.8 } = {}) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!playing || duration <= 0) return;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      timeRef.current = (timeRef.current + (now - last) / 1000) % (duration + tail);
      last = now;
      setTime(timeRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration, tail]);

  return {
    time,
    playing,
    toggle: () => setPlaying((p) => !p),
    seek: (t: number) => {
      timeRef.current = t;
      setTime(t);
    },
  };
}
