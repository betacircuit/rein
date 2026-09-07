"use client";

import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { payloadToPrecipitation, taskLoadToPrecipitation } from "@/lib/rainy/weather";

export type RainyAvatarState = "idle" | "thinking" | "executing" | "blocked";

type RainyWeatherContextValue = {
  avatarState: RainyAvatarState;
  precipitation: number;
  setAvatarState: (state: RainyAvatarState) => void;
  setTaskWorkload: (activeTasks: number) => void;
  setPayloadWorkload: (payloadSize: number) => void;
  strike: (payloadSize: number) => void;
};

const RainyWeatherContext = createContext<RainyWeatherContextValue | null>(null);

function RainCanvas({ precipitation }: { precipitation: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    canvas.dataset.motion = reducedMotion ? "reduced" : "active";
    let width = 0;
    let height = 0;
    let frame = 0;
    let drops: Array<{ x: number; y: number; length: number; speed: number }> = [];

    const resetDrop = (drop: (typeof drops)[number], fromTop = true) => {
      drop.x = Math.random() * width;
      drop.y = fromTop ? -Math.random() * height * 0.35 : Math.random() * height;
      drop.length = 8 + Math.random() * (10 + precipitation * 0.12);
      drop.speed = 1.8 + Math.random() * 2.5 + precipitation * 0.055;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const deviceScale =
        width < 640 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
          ? 0.55
          : 1;
      const count = reducedMotion ? 8 : Math.round((14 + precipitation * 1.15) * deviceScale);
      drops = Array.from({ length: count }, () => ({ x: 0, y: 0, length: 0, speed: 0 }));
      drops.forEach((drop) => resetDrop(drop, false));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.lineWidth = precipitation > 70 ? 2 : 1.25;
      context.strokeStyle = `rgba(30, 121, 147, ${0.16 + precipitation * 0.0026})`;
      context.beginPath();
      for (const drop of drops) {
        context.moveTo(drop.x, drop.y);
        context.lineTo(drop.x - drop.length * 0.2, drop.y + drop.length);
        if (!reducedMotion) {
          drop.y += drop.speed;
          drop.x -= drop.speed * 0.2;
          if (drop.y > height + drop.length || drop.x < -drop.length) resetDrop(drop);
        }
      }
      context.stroke();
      if (!reducedMotion && document.visibilityState === "visible") {
        frame = window.requestAnimationFrame(draw);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      if (!reducedMotion && !frame) frame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [precipitation]);

  return <canvas aria-hidden="true" className="rainy-canvas" ref={canvasRef} />;
}

export function RainyWeatherProvider({ children }: { children: ReactNode }) {
  const [avatarState, setAvatarState] = useState<RainyAvatarState>("idle");
  const [taskLoad, setTaskLoad] = useState(0);
  const [payloadLoad, setPayloadLoad] = useState(0);
  const [lightningTick, setLightningTick] = useState(0);
  const [eventTick, setEventTick] = useState(0);
  const payloadTimer = useRef<number | null>(null);

  const setTaskWorkload = useCallback((activeTasks: number) => {
    setTaskLoad(taskLoadToPrecipitation(activeTasks));
  }, []);

  const setPayloadWorkload = useCallback((payloadSize: number) => {
    setPayloadLoad(payloadToPrecipitation(payloadSize));
    if (payloadTimer.current) window.clearTimeout(payloadTimer.current);
    payloadTimer.current = window.setTimeout(() => setPayloadLoad(0), 1400);
  }, []);

  const strike = useCallback(
    (payloadSize: number) => {
      setLightningTick((tick) => tick + 1);
      setEventTick((tick) => tick + 1);
      setPayloadWorkload(payloadSize);
    },
    [setPayloadWorkload],
  );

  useEffect(
    () => () => {
      if (payloadTimer.current) window.clearTimeout(payloadTimer.current);
    },
    [],
  );

  const precipitation = Math.max(taskLoad, payloadLoad);
  const value = useMemo(
    () => ({
      avatarState,
      precipitation,
      setAvatarState,
      setPayloadWorkload,
      setTaskWorkload,
      strike,
    }),
    [avatarState, precipitation, setPayloadWorkload, setTaskWorkload, strike],
  );

  return (
    <RainyWeatherContext.Provider value={value}>
      <div aria-hidden="true" className="rainy-weather-stage" data-precipitation={precipitation}>
        <RainCanvas precipitation={precipitation} />
        {lightningTick > 0 && (
          <div className="rainy-screen-flash" data-strike={lightningTick} key={lightningTick}>
            <span />
          </div>
        )}
        {eventTick > 0 && (
          <div className="rainy-event-burst" data-event={eventTick} key={`event-${eventTick}`}>
            <i className="rainy-event-burst__ring rainy-event-burst__ring--one" />
            <i className="rainy-event-burst__ring rainy-event-burst__ring--two" />
            <i className="rainy-event-burst__wind rainy-event-burst__wind--one" />
            <i className="rainy-event-burst__wind rainy-event-burst__wind--two" />
            <i className="rainy-event-burst__wind rainy-event-burst__wind--three" />
            {Array.from({ length: 14 }, (_, index) => (
              <i
                className="rainy-event-burst__pixel"
                key={index}
                style={{ "--burst-index": index } as CSSProperties}
              />
            ))}
          </div>
        )}
      </div>
      {children}
    </RainyWeatherContext.Provider>
  );
}

export function useRainyWeather() {
  const value = useContext(RainyWeatherContext);
  if (!value) throw new Error("useRainyWeather must be used inside RainyWeatherProvider");
  return value;
}
