"use client";

import { useEffect, useState } from "react";

export function ReinLoading({ label = "화면을 불러오는 중" }: { label?: string }) {
  // A loader that flashes past while still visually empty reads as broken, so the
  // bar starts already filled enough to be legible as a bar.
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    let frame = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame = window.requestAnimationFrame(() => setProgress(100));
      return () => window.cancelAnimationFrame(frame);
    }
    const startedAt = performance.now();
    // Complete decisively: users should always see a finished load state rather
    // than a progress bar that disappears mid-way on fast route transitions.
    const duration = 420;
    const advance = (now: number) => {
      const elapsed = Math.min(1, (now - startedAt) / duration);
      setProgress(12 + Math.round(elapsed * 88));
      if (elapsed < 1) frame = window.requestAnimationFrame(advance);
    };

    frame = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      aria-busy={progress < 100}
      aria-label={`${label} ${progress}%`}
      aria-live="polite"
      className="rein-loader"
      role="status"
    >
      <div aria-hidden="true" className="rein-loader__scene">
        <div className="rein-loader__cube">
          <span className="rein-loader__face rein-loader__face--front" />
          <span className="rein-loader__face rein-loader__face--back" />
          <span className="rein-loader__face rein-loader__face--right" />
          <span className="rein-loader__face rein-loader__face--left" />
          <span className="rein-loader__face rein-loader__face--top" />
          <span className="rein-loader__face rein-loader__face--bottom" />
        </div>
      </div>
      <div className="rein-loader__progress">
        <div aria-hidden="true" className="rein-loader__track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <output aria-hidden="true">{progress}%</output>
      </div>
    </div>
  );
}
