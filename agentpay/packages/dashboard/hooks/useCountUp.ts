import { useEffect, useState } from "react";

export function useCountUp(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let startTime: number | undefined;
    let frame = 0;
    const step = (timestamp: number) => {
      if (startTime === undefined) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(progress < 1 ? Math.floor(eased * target) : target);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [target, duration, start]);

  return value;
}
